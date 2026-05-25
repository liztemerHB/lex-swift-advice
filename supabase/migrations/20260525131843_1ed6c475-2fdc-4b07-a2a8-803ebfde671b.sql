
CREATE POLICY "Admins upload lawyer docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lawyer-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update lawyer docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lawyer-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete lawyer docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lawyer-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
