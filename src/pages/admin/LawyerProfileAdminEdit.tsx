import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Upload, X, Camera, FileText, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { PRACTICE_AREAS, LANGUAGES } from "@/config/lawyerProfile";

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
  completed: boolean;
};

const empty: Profile = {
  photo_url: null,
  region: "",
  city: "",
  education: "",
  additional_education: "",
  practice_areas: [],
  work_experience: "",
  years_experience: null,
  bio: "",
  languages: [],
  is_advocate: false,
  advocate_since: null,
  bar_chamber: "",
  license_number: "",
  diploma_urls: [],
  completed: false,
};

const LawyerProfileAdminEdit = () => {
  const { id: lawyerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(empty);
  const [peer, setPeer] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lawyerId) return;
    (async () => {
      const [{ data }, { data: pr }] = await Promise.all([
        supabase.from("lawyer_profiles").select("*").eq("user_id", lawyerId).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", lawyerId).maybeSingle(),
      ]);
      if (data) setProfile({ ...empty, ...(data as any) });
      setPeer((pr as any) ?? null);
      setLoading(false);
    })();
  }, [lawyerId]);

  const isComplete = useMemo(
    () =>
      !!(
        profile.region &&
        profile.education &&
        profile.work_experience &&
        profile.practice_areas.length > 0 &&
        profile.years_experience !== null
      ),
    [profile],
  );

  const togglePractice = (area: string) =>
    setProfile((p) => ({
      ...p,
      practice_areas: p.practice_areas.includes(area)
        ? p.practice_areas.filter((a) => a !== area)
        : [...p.practice_areas, area],
    }));

  const toggleLanguage = (lang: string) =>
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((a) => a !== lang) : [...p.languages, lang],
    }));

  const uploadFile = async (file: File, kind: "photo" | "doc") => {
    if (!lawyerId) return null;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Максимальный размер 10 МБ");
      return null;
    }
    const ext = file.name.split(".").pop() || "bin";
    const path = `${lawyerId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("lawyer-docs").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return path;
  };

  const onPhoto = async (file: File) => {
    setUploadingPhoto(true);
    const path = await uploadFile(file, "photo");
    setUploadingPhoto(false);
    if (path) setProfile((p) => ({ ...p, photo_url: path }));
  };

  const onDoc = async (file: File) => {
    setUploadingDoc(true);
    const path = await uploadFile(file, "doc");
    setUploadingDoc(false);
    if (path) setProfile((p) => ({ ...p, diploma_urls: [...p.diploma_urls, path] }));
  };

  const removeDoc = (path: string) =>
    setProfile((p) => ({ ...p, diploma_urls: p.diploma_urls.filter((d) => d !== path) }));

  const save = async () => {
    if (!lawyerId) return;
    setSaving(true);
    const payload = {
      user_id: lawyerId,
      ...profile,
      years_experience: profile.years_experience ?? null,
      advocate_since: profile.is_advocate ? profile.advocate_since : null,
      completed: isComplete,
    };
    const { error } = await supabase.from("lawyer_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Профиль сохранён");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${lawyerId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="truncate text-xl font-bold text-foreground">
            Профиль юриста — {peer?.full_name || peer?.email || "—"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Редактирование от имени администратора. {isComplete ? "Профиль виден клиентам." : "Профиль скрыт от клиентов."}
          </p>
        </div>
        <Link to={`/lawyers/${lawyerId}`} target="_blank">
          <Button size="sm" variant="outline">
            <Eye className="mr-1.5 h-4 w-4" /> Как видит клиент
          </Button>
        </Link>
        <Button size="sm" variant="hero" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-1.5">Сохранить</span>
        </Button>
      </header>

      <section className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <PhotoPreview path={profile.photo_url} />
        <div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
          <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}>
            {uploadingPhoto ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
            {profile.photo_url ? "Заменить фото" : "Загрузить фото"}
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">До 10 МБ</p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Регион работы *</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Регион / субъект РФ">
            <Input value={profile.region ?? ""} onChange={(e) => setProfile({ ...profile, region: e.target.value })} />
          </Field>
          <Field label="Город">
            <Input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Образование *</h3>
        <Field label="Высшее юридическое образование">
          <Textarea
            rows={3}
            value={profile.education ?? ""}
            onChange={(e) => setProfile({ ...profile, education: e.target.value })}
          />
        </Field>
        <Field label="Дополнительное образование">
          <Textarea
            rows={3}
            value={profile.additional_education ?? ""}
            onChange={(e) => setProfile({ ...profile, additional_education: e.target.value })}
          />
        </Field>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дипломы и сертификаты</h3>
        <div className="space-y-1.5">
          {profile.diploma_urls.map((path) => (
            <DocRow key={path} path={path} onRemove={() => removeDoc(path)} />
          ))}
        </div>
        <input
          ref={docRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onDoc(e.target.files[0])}
        />
        <Button variant="outline" size="sm" onClick={() => docRef.current?.click()} disabled={uploadingDoc}>
          {uploadingDoc ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Загрузить документ
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Опыт работы *</h3>
        <Field label="Стаж (лет)">
          <Input
            type="number"
            min={0}
            max={70}
            value={profile.years_experience ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, years_experience: e.target.value ? parseInt(e.target.value) : null })
            }
          />
        </Field>
        <Field label="Опыт работы">
          <Textarea
            rows={4}
            value={profile.work_experience ?? ""}
            onChange={(e) => setProfile({ ...profile, work_experience: e.target.value })}
          />
        </Field>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Практика *</h3>
        <div className="flex flex-wrap gap-1.5">
          {PRACTICE_AREAS.map((a) => {
            const on = profile.practice_areas.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => togglePractice(a)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Языки</h3>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => {
            const on = profile.languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLanguage(l)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Статус адвоката</p>
            <p className="text-xs text-muted-foreground">Удостоверение адвоката</p>
          </div>
          <Switch
            checked={profile.is_advocate}
            onCheckedChange={(v) => setProfile({ ...profile, is_advocate: v })}
          />
        </div>
        {profile.is_advocate && (
          <div className="space-y-3">
            <Field label="Дата получения статуса">
              <Input
                type="date"
                value={profile.advocate_since ?? ""}
                onChange={(e) => setProfile({ ...profile, advocate_since: e.target.value || null })}
              />
            </Field>
            <Field label="Адвокатская палата">
              <Input
                value={profile.bar_chamber ?? ""}
                onChange={(e) => setProfile({ ...profile, bar_chamber: e.target.value })}
              />
            </Field>
            <Field label="Реестровый номер">
              <Input
                value={profile.license_number ?? ""}
                onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
              />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">О себе</h3>
        <Textarea
          rows={4}
          value={profile.bio ?? ""}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          maxLength={1000}
        />
      </section>

      <Button variant="hero" className="w-full" disabled={saving} onClick={save}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Сохранить профиль
      </Button>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const PhotoPreview = ({ path }: { path: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage.from("lawyer-docs").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return (
    <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
      {url ? (
        <img src={url} alt="Фото" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Camera className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

const DocRow = ({ path, onRemove }: { path: string; onRemove: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("lawyer-docs").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  const name = path.split("/").pop();
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
      </a>
      <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default LawyerProfileAdminEdit;
