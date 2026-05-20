import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, MapPin, Briefcase, GraduationCap, Award, Languages, FileText, ShieldCheck } from "lucide-react";

type Profile = {
  photo_url: string | null;
  region: string | null;
  city: string | null;
  education: string | null;
  additional_education: string | null;
  practice_areas: string[];
  work_experience: string | null;
  years_experience: number | null;
  bio: string | null;
  languages: string[];
  is_advocate: boolean;
  advocate_since: string | null;
  bar_chamber: string | null;
  license_number: string | null;
  diploma_urls: string[];
};

type Peer = { full_name: string | null; email: string | null };

const LawyerProfileView = () => {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<{ path: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lawyerId) return;
    (async () => {
      const [{ data: p }, { data: pr }] = await Promise.all([
        supabase.from("lawyer_profiles").select("*").eq("user_id", lawyerId).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", lawyerId).maybeSingle(),
      ]);
      setProfile((p as any) ?? null);
      setPeer((pr as any) ?? null);
      if (p?.photo_url) {
        const { data } = await supabase.storage.from("lawyer-docs").createSignedUrl(p.photo_url, 3600);
        setPhotoUrl(data?.signedUrl ?? null);
      }
      if (p?.diploma_urls?.length) {
        const urls = await Promise.all(
          p.diploma_urls.map(async (path: string) => {
            const { data } = await supabase.storage.from("lawyer-docs").createSignedUrl(path, 3600);
            return { path, url: data?.signedUrl ?? "" };
          }),
        );
        setDocUrls(urls);
      }
      setLoading(false);
    })();
  }, [lawyerId]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-app items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-app flex-col bg-background">
        <Header />
        <div className="flex-1 px-4 py-10 text-center text-sm text-muted-foreground">
          Юрист ещё не заполнил профиль.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col bg-background">
      <Header />

      <div className="flex-1 space-y-5 px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
            {photoUrl ? (
              <img src={photoUrl} alt="Фото" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                {(peer?.full_name || peer?.email || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-foreground">{peer?.full_name || peer?.email || "Юрист"}</p>
            {profile.is_advocate && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <ShieldCheck className="h-3 w-3" /> Адвокат
              </span>
            )}
            {(profile.city || profile.region) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[profile.city, profile.region].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm text-foreground">{profile.bio}</p>
        )}

        {profile.practice_areas.length > 0 && (
          <Section icon={<Briefcase className="h-4 w-4" />} title="Специализация">
            <div className="flex flex-wrap gap-1.5">
              {profile.practice_areas.map((a) => (
                <span key={a} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {a}
                </span>
              ))}
            </div>
          </Section>
        )}

        {(profile.years_experience !== null || profile.work_experience) && (
          <Section icon={<Briefcase className="h-4 w-4" />} title="Опыт работы">
            {profile.years_experience !== null && (
              <p className="text-sm font-semibold text-foreground">{profile.years_experience} лет стажа</p>
            )}
            {profile.work_experience && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.work_experience}</p>
            )}
          </Section>
        )}

        {(profile.education || profile.additional_education) && (
          <Section icon={<GraduationCap className="h-4 w-4" />} title="Образование">
            {profile.education && <p className="whitespace-pre-wrap text-sm text-foreground">{profile.education}</p>}
            {profile.additional_education && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.additional_education}</p>
            )}
          </Section>
        )}

        {profile.is_advocate && (profile.advocate_since || profile.bar_chamber || profile.license_number) && (
          <Section icon={<Award className="h-4 w-4" />} title="Статус адвоката">
            <div className="space-y-1 text-sm">
              {profile.bar_chamber && <p className="text-foreground">{profile.bar_chamber}</p>}
              {profile.license_number && <p className="text-muted-foreground">Реестровый № {profile.license_number}</p>}
              {profile.advocate_since && (
                <p className="text-muted-foreground">
                  С {new Date(profile.advocate_since).toLocaleDateString("ru-RU")}
                </p>
              )}
            </div>
          </Section>
        )}

        {profile.languages.length > 0 && (
          <Section icon={<Languages className="h-4 w-4" />} title="Языки">
            <p className="text-sm text-foreground">{profile.languages.join(", ")}</p>
          </Section>
        )}

        {docUrls.length > 0 && (
          <Section icon={<FileText className="h-4 w-4" />} title="Дипломы и сертификаты">
            <div className="space-y-1.5">
              {docUrls.map((d) => (
                <a
                  key={d.path}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{d.path.split("/").pop()}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

const Header = () => (
  <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
    <button onClick={() => window.history.back()} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
      <ArrowLeft className="h-4 w-4" />
    </button>
    <p className="text-sm font-semibold text-foreground">Профиль юриста</p>
  </header>
);

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </div>
    <div className="space-y-1">{children}</div>
  </section>
);

export default LawyerProfileView;
