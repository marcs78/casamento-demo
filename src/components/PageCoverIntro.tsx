"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, Sparkles } from "lucide-react";

interface PinConfigData {
  noivosPin: string;
  cerimonialPin: string;
  updatedAt: string | null;
}

interface PageCoverIntroProps {
  imageSrc: string;
  imageAlt: string;
  badgeText?: string;
  title: string;
  subtitle?: string;
  buttonText: string;
  helperText?: string;
  onEnter: () => void;
  pinRole?: "noivos" | "cerimonialista";
  isAuthenticated?: boolean;
  isCheckingAuth?: boolean;
  onPinUnlocked?: (pins?: PinConfigData) => void;
}

export default function PageCoverIntro({
  imageSrc,
  imageAlt,
  badgeText,
  title,
  subtitle,
  buttonText,
  helperText,
  onEnter,
  pinRole,
  isAuthenticated = true,
  isCheckingAuth = false,
  onPinUnlocked,
}: PageCoverIntroProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requiresPin = Boolean(pinRole) && !isAuthenticated;

  const handleCardClick = () => {
    if (isCheckingAuth || requiresPin) return;
    onEnter();
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!pinRole || !pin.trim()) {
      setErrorMsg("Digite o PIN de acesso para continuar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock",
          role: pinRole,
          pin: pin.trim(),
          remember,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.authenticated) {
        setPin("");
        onPinUnlocked?.(data.pins);
        onEnter();
      } else {
        setErrorMsg(data?.error || "PIN incorreto. Tente novamente.");
      }
    } catch {
      setErrorMsg("Não foi possível validar o PIN agora. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF7F0] px-4 py-8 select-none">
      {/* Card Principal de Boas-Vindas / Bloqueio por PIN */}
      <div
        onClick={handleCardClick}
        className={`group relative mx-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-3.5 sm:p-5 shadow-2xl transition-all duration-500 ${
          requiresPin
            ? ""
            : "cursor-pointer hover:shadow-3xl hover:border-[#C17767]/50 active:scale-[0.99]"
        }`}
      >
        {/* Imagem Oficial do Card */}
        <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-[#E8CBC3]/60 shadow-md">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-103"
            priority
            sizes="(max-width: 640px) 100vw, 440px"
          />

          {/* Brilho / Cadeado sutil no canto */}
          <div className="absolute right-2.5 top-2.5 rounded-full bg-white/80 backdrop-blur-xs p-1.5 text-[#C17767] shadow-xs opacity-90">
            {requiresPin ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            )}
          </div>
        </div>

        {/* Informações e Ação */}
        <div className="pt-5 pb-2 text-center space-y-3">
          {badgeText && (
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C17767]">
              {badgeText}
            </p>
          )}

          <div className="space-y-1">
            <h2 className="font-serif text-2xl sm:text-[26px] font-semibold text-[#3E2723] tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#6E5F57] line-clamp-2 px-2">
                {subtitle}
              </p>
            )}
          </div>

          {isCheckingAuth ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C17767] border-t-transparent" />
              <span className="text-xs text-[#6E5F57]">Verificando acesso seguro...</span>
            </div>
          ) : requiresPin ? (
            <form
              onSubmit={handleUnlock}
              onClick={(e) => e.stopPropagation()}
              className="pt-1 space-y-3 text-left"
            >
              <div className="rounded-2xl border border-[#E8CBC3] bg-white p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="admin-pin-input"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#3E2723]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5F6F52]" />
                    <span>PIN de Segurança</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6E5F57] hover:text-[#C17767] cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? "Ocultar" : "Mostrar"}</span>
                  </button>
                </div>

                <input
                  id="admin-pin-input"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="• • • •"
                  maxLength={16}
                  className="h-11 w-full rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-4 text-center font-mono text-lg font-bold tracking-[0.35em] text-[#3E2723] placeholder:text-[#8C7A70]/50 focus:border-[#C17767] focus:bg-white focus:outline-none transition-colors"
                />

                {pinRole && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#C8D4C0] bg-[#F0F4ED]/80 px-3 py-2 text-[11px] text-[#3E2723]">
                    <span>
                      PIN de Demonstração:{" "}
                      <strong className="font-mono text-[#5F6F52]">
                        {pinRole === "noivos" ? "1234" : "4321"}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPin(pinRole === "noivos" ? "1234" : "4321");
                        setErrorMsg(null);
                      }}
                      className="rounded-full bg-[#5F6F52] px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#4E5C43] cursor-pointer"
                    >
                      Preencher
                    </button>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-[#6E5F57] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#5F6F52] cursor-pointer"
                  />
                  <span>Manter conectado neste aparelho</span>
                </label>

                {errorMsg && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700 animate-in fade-in duration-150">
                    {errorMsg}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#C17767] px-6 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-lg shadow-[#C17767]/35 transition-all duration-300 hover:bg-[#B36858] disabled:opacity-60 active:scale-98"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Desbloqueando..." : "Desbloquear Acesso"}</span>
              </button>
            </form>
          ) : (
            <>
              {pinRole && (
                <div className="pt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] px-3 py-0.5 text-[10.5px] font-bold text-[#5F6F52]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Acesso liberado neste aparelho</span>
                  </span>
                </div>
              )}

              {/* Botão de Destaque */}
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnter();
                  }}
                  className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#C17767] px-6 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-lg shadow-[#C17767]/35 transition-all duration-300 hover:bg-[#B36858] active:scale-98"
                >
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </>
          )}

          {helperText && (
            <p className="font-serif text-[11px] italic text-[#8C7A70] pt-0.5">
              {helperText}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
