
-- cases INSERT: require authenticated owner. Anonymous case creation is done server-side via service role.
DROP POLICY IF EXISTS "Anyone can insert cases" ON public.cases;
CREATE POLICY "Users insert own cases"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- cases UPDATE: drop user_id IS NULL loophole
DROP POLICY IF EXISTS "Users update own cases" ON public.cases;
CREATE POLICY "Users update own cases"
ON public.cases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- case_messages SELECT: drop user_id IS NULL loophole
DROP POLICY IF EXISTS "View messages of accessible case" ON public.case_messages;
CREATE POLICY "View messages of accessible case"
ON public.case_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_messages.case_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

-- case_messages INSERT: drop user_id IS NULL loophole
DROP POLICY IF EXISTS "Insert messages of accessible case" ON public.case_messages;
CREATE POLICY "Insert messages of accessible case"
ON public.case_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_messages.case_id
      AND c.user_id = auth.uid()
  )
);

-- Restrict SECURITY DEFINER helpers from direct client invocation
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_chat_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_chat_thread_on_purchase() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Realtime: only chat thread participants (or admins) can subscribe to chat_<threadId> topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat thread participants can receive" ON realtime.messages;
CREATE POLICY "Chat thread participants can receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'chat\_%' ESCAPE '\' THEN
      EXISTS (
        SELECT 1 FROM public.chat_threads t
        WHERE t.id::text = substring(realtime.topic() FROM 6)
          AND (t.lawyer_id = auth.uid()
               OR t.client_id = auth.uid()
               OR public.has_role(auth.uid(), 'admin'::public.app_role))
      )
    ELSE true
  END
);
