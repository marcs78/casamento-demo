/**
 * Utilitário de Geração de Código Pix Copia e Cola (Padrão BR Code / EMV do Banco Central do Brasil)
 * com valor dinamicamente vinculado ("amarrado") à cota selecionada e suporte a Chave CPF.
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadOptions {
  key: string;
  name: string;
  city: string;
  amount: number;
  txId?: string;
  description?: string;
}

/**
 * Normaliza a chave Pix para o padrão EMV do Banco Central:
 * Se for um CPF formatado (000.000.000-00), mantém apenas os 11 dígitos numéricos.
 */
export function normalizePixKeyForEmv(key: string): string {
  const trimmed = key.trim();
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\D/g, "");
  }
  return trimmed;
}

export function generatePixPayload({
  key,
  name,
  city,
  amount,
  txId = "CASAMENTO2027",
  description,
}: PixPayloadOptions): string {
  const emvKey = normalizePixKeyForEmv(key);
  const cleanTxId =
    (txId || "CASAMENTO2027").replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "CASAMENTO2027";
  const cleanName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 25);

  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 15);

  const gui = formatField("00", "br.gov.bcb.pix");
  const chave = formatField("01", emvKey);
  const infoAdicional = description
    ? formatField(
        "02",
        description
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .substring(0, 40)
      )
    : "";
  const merchantAccountInfo = formatField("26", `${gui}${chave}${infoAdicional}`);

  const mcc = formatField("52", "0000");
  const currency = formatField("53", "986");
  const formattedAmount = amount.toFixed(2);
  const amountField = formatField("54", formattedAmount);
  const country = formatField("58", "BR");
  const merchantName = formatField("59", cleanName);
  const merchantCity = formatField("60", cleanCity);
  const referenceLabel = formatField("05", cleanTxId);
  const additionalData = formatField("62", referenceLabel);

  const payloadWithoutCrc = `000201${merchantAccountInfo}${mcc}${currency}${amountField}${country}${merchantName}${merchantCity}${additionalData}6304`;
  const checksum = crc16(payloadWithoutCrc);

  return `${payloadWithoutCrc}${checksum}`;
}
