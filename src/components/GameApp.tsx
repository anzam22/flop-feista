import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Ferry } from "@/components/Ferry";
import { Multiplayer } from "@/components/Multiplayer";
import { Player } from "@/components/Player";
import { Props } from "@/components/Props";
import { Sim } from "@/components/Sim";
import { PALETTE, ROLES } from "@/lib/level";
import { roomCodeFromUrl } from "@/lib/room";
import { net, sim } from "@/lib/net-shared";
import { useGameStore } from "@/store/useGameStore";

function setRoomInUrl(room: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("room", room);
  window.history.replaceState(null, "", url);
}

function GameCanvas({ name, playerIndex }: { name: string; playerIndex: number }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [9, 7, 9], fov: 48, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 34, 150]} />
      <ambientLight intensity={1.7} />
      <directionalLight
        castShadow
        position={[12, 20, 10]}
        intensity={3.2}
        shadow-mapSize={[2048, 2048]}
      />
      <Physics gravity={[0, -18, 0]}>
        <Ferry />
        <Props />
        <Player index={playerIndex} />
        <Multiplayer name={name} />
        <Sim />
      </Physics>
    </Canvas>
  );
}

function Meter({ label, value, color, text }: { label: string; value: number; color: string; text: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-32 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 shadow-lg backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
        <span>{label}</span>
        <span className="text-white/90">{text}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: String(percent) + "%", backgroundColor: color }} />
      </div>
    </div>
  );
}

function GameHud() {
  const room = useGameStore((s) => s.room);
  const phase = useGameStore((s) => s.phase);
  const roster = useGameStore((s) => s.roster);
  const myRoles = useGameStore((s) => s.myRoles);
  const integrity = useGameStore((s) => s.integrity);
  const heat = useGameStore((s) => s.heat);
  const progress = useGameStore((s) => s.progress);
  const speed = useGameStore((s) => s.speed);
  const leaks = useGameStore((s) => s.leaks);
  const crates = useGameStore((s) => s.crates);
  const pax = useGameStore((s) => s.pax);
  const alert = useGameStore((s) => s.alert);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white">
      <div className="pointer-events-auto absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Wobble Ferry</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
            <span>ROOM {room || "----"}</span>
            <span className="h-1 w-1 rounded-full bg-emerald-300" />
            <span>{roster.length || 1}/4 ABOARD</span>
          </div>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-xs font-bold text-white/80 shadow-xl backdrop-blur-md transition hover:border-cyan-300/50 hover:text-white"
        >
          {copied ? "LINK COPIED" : "COPY ROOM LINK"}
        </button>
      </div>

      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-2">
        <Meter label="Hull" value={integrity} color="#6ee7b7" text={String(integrity) + "%"} />
        <Meter label="Engine" value={heat * 100} color={heat > 0.82 ? "#fb7185" : "#fbbf24"} text={String(Math.round(heat * 100)) + "%"} />
        <Meter label="Voyage" value={progress * 100} color="#67e8f9" text={String(Math.round(progress * 100)) + "%"} />
      </div>

      <div className="absolute bottom-4 left-4 max-w-xs space-y-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Your duties</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {myRoles.length ? myRoles.map((roleKey) => {
              const role = ROLES.find((item) => item.key === roleKey);
              return <span key={roleKey} className="rounded-full bg-cyan-300/15 px-2 py-1 text-xs font-bold text-cyan-200">{role?.name ?? roleKey}</span>;
            }) : <span className="text-xs text-white/60">Assigning crew stations…</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-xs text-white/65 shadow-xl backdrop-blur-md">
          <div className="mb-1 font-bold text-white/90">Crew: {roster.length ? roster.map((member) => member.name).join(" · ") : "connecting…"}</div>
          <div>{Math.round(speed)} knots · {leaks} leak{leaks === 1 ? "" : "s"} · {crates} crates · {pax} passengers</div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-right text-xs text-white/60 shadow-xl backdrop-blur-md">
        <div><span className="font-bold text-white/90">WASD</span> move / steer</div>
        <div><span className="font-bold text-white/90">E</span> interact · <span className="font-bold text-white/90">SPACE</span> jump</div>
      </div>

      {alert ? (
        <div className="absolute left-1/2 top-28 max-w-md -translate-x-1/2 rounded-full border border-amber-300/25 bg-amber-950/75 px-5 py-2 text-center text-sm font-semibold text-amber-100 shadow-xl backdrop-blur-md">
          {alert}
        </div>
      ) : null}

      {phase !== "playing" ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
          <div className="mx-4 max-w-md rounded-3xl border border-white/15 bg-slate-950/90 p-8 text-center shadow-2xl">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">{phase === "docked" ? "Safe arrival" : "The ferry sank"}</div>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{phase === "docked" ? "You made it!" : "Crew overboard."}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">{phase === "docked" ? "Everyone pulled together and reached the dock." : "The hull integrity reached zero. Try a slower, less chaotic crossing."}</p>
            <button type="button" onClick={() => { sim.reset(); useGameStore.getState().backToMenu(); }} className="mt-6 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-200">Back to harbor</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Menu({ onStart }: { onStart: () => void }) {
  const name = useGameStore((s) => s.name);
  const room = useGameStore((s) => s.room);
  const setName = useGameStore((s) => s.setName);
  const setRoom = useGameStore((s) => s.setRoom);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-5 py-10 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-orange-400/15 blur-3xl" />
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-2xl backdrop-blur-xl">
        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          <section className="relative min-h-[560px] overflow-hidden p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.18),transparent_42%),linear-gradient(145deg,rgba(14,116,144,0.16),transparent_55%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Co-op physics voyage</div>
                <h1 className="mt-7 max-w-lg text-6xl font-black leading-[0.88] tracking-[-0.07em] text-white sm:text-8xl">Wobble<br /><span className="text-cyan-300">Ferry</span></h1>
                <p className="mt-7 max-w-md text-base leading-7 text-white/60">A tiny crew. One wildly unstable boat. Keep the engine cool, patch the leaks, and do not let the passengers discover the edge.</p>
              </div>
              <div className="grid max-w-md grid-cols-2 gap-3 text-xs text-white/55">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-1 text-lg">⚓</div><b className="text-white/90">4 roles</b><br />Every station matters.</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-1 text-lg">🌊</div><b className="text-white/90">2–4 players</b><br />Share one room link.</div>
              </div>
            </div>
          </section>
          <section className="flex flex-col justify-center border-t border-white/10 bg-white/[0.035] p-8 sm:p-12 md:border-l md:border-t-0">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Prepare to sail</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Join the crew</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">Use the same room code as your friends. You can copy the invite link after boarding.</p>
            <form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); onStart(); }}>
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/55">Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Captain Noodle" maxLength={18} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/60" autoFocus /></label>
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/55">Room code<input value={room} onChange={(event) => setRoom(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="Generated automatically" maxLength={8} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm uppercase tracking-[0.2em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 focus:border-cyan-300/60" /></label>
              <button type="submit" className="w-full rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200">Board the ferry</button>
            </form>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live rooms use Supabase Realtime.</div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function GameApp() {
  const phase = useGameStore((s) => s.phase);
  const room = useGameStore((s) => s.room);
  const name = useGameStore((s) => s.name);
  const roster = useGameStore((s) => s.roster);
  const setRoom = useGameStore((s) => s.setRoom);
  const setName = useGameStore((s) => s.setName);
  const start = useGameStore((s) => s.start);

  useEffect(() => {
    setRoom(roomCodeFromUrl());
  }, [setRoom]);

  const handleStart = () => {
    const cleanName = name.trim() || "Deckhand";
    const cleanRoom = (room.trim() || roomCodeFromUrl()).toUpperCase();
    setName(cleanName);
    setRoom(cleanRoom);
    setRoomInUrl(cleanRoom);
    sim.reset();
    start();
  };

  if (phase === "menu") return <Menu onStart={handleStart} />;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#bfe7ff]">
      <GameCanvas name={name} playerIndex={Math.max(0, net.myIndex)} key={roster.length} />
      <GameHud />
    </main>
  );
}
