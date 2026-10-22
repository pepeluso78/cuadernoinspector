CREATE TABLE public.centros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_centro TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_centro TEXT,
  localidad TEXT DEFAULT 'Albacete',
  email_centro TEXT,
  telefono TEXT,
  director_nombre TEXT,
  director_email TEXT,
  director_fecha_nombramiento DATE,
  jefe_estudios_nombre TEXT,
  jefe_estudios_email TEXT,
  jefe_estudios_fecha_nombramiento DATE,
  secretario_nombre TEXT,
  secretario_email TEXT,
  secretario_fecha_nombramiento DATE,
  observaciones_generales TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.checklists_centro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES public.centros(id) ON DELETE CASCADE,
  curso_escolar TEXT NOT NULL DEFAULT '2026/2027',
  categoria TEXT NOT NULL CHECK (categoria IN ('Plan de Mejora','Horarios','PGA','Jefaturas de Departamento','Nombramiento Director y Cargos')),
  estado_global TEXT DEFAULT 'Pendiente',
  items_verificacion JSONB DEFAULT '[]',
  observaciones_inspector TEXT,
  requerimiento_generado TEXT,
  fecha_supervision DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, curso_escolar, categoria)
);
CREATE TABLE public.tramites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_registro TEXT,
  origen TEXT NOT NULL,
  remitente TEXT,
  centro_id UUID REFERENCES public.centros(id) ON DELETE SET NULL,
  asunto TEXT NOT NULL,
  descripcion_entrada TEXT,
  tipo_actuacion TEXT DEFAULT 'Informe Nota Interior',
  plazo_dias INTEGER DEFAULT 10,
  fecha_entrada DATE DEFAULT CURRENT_DATE,
  fecha_limite DATE DEFAULT (CURRENT_DATE + INTERVAL '10 days'),
  prioridad TEXT DEFAULT 'Media',
  estado TEXT DEFAULT 'Pendiente',
  borrador_informe TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.notas_centro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES public.centros(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT,
  importante BOOLEAN DEFAULT false,
  fecha_registro TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  centro_id UUID REFERENCES public.centros(id) ON DELETE SET NULL,
  tramite_id UUID UNIQUE REFERENCES public.tramites(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  realizada BOOLEAN DEFAULT false,
  notas_visita TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.normativa_clm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloque_tematico TEXT NOT NULL,
  rango_normativo TEXT NOT NULL,
  titulo_norma TEXT NOT NULL,
  etapa_educativa TEXT DEFAULT 'Todas',
  url_enlace TEXT NOT NULL,
  cita_informes TEXT,
  notas_inspector TEXT
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['centros','checklists_centro','tramites','notas_centro','agenda_eventos','normativa_clm'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sync_vencimiento_tramite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.agenda_eventos (titulo, tipo_evento, centro_id, tramite_id, fecha_inicio, realizada)
  VALUES ('Vence: ' || NEW.asunto, 'Vencimiento Trámite', NEW.centro_id, NEW.id,
          (NEW.fecha_limite::timestamp + time '09:00') AT TIME ZONE 'Europe/Madrid',
          NEW.estado = 'Respondido / Elevado')
  ON CONFLICT (tramite_id) DO UPDATE SET titulo = EXCLUDED.titulo, centro_id = EXCLUDED.centro_id,
    fecha_inicio = EXCLUDED.fecha_inicio, realizada = EXCLUDED.realizada;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_tramite_vencimiento AFTER INSERT OR UPDATE OF fecha_limite, asunto, centro_id, estado ON public.tramites
FOR EACH ROW EXECUTE FUNCTION public.sync_vencimiento_tramite();

INSERT INTO public.normativa_clm (bloque_tematico, rango_normativo, titulo_norma, etapa_educativa, url_enlace, cita_informes) VALUES
('Inspección', 'Real Decreto', 'Real Decreto 2193/1995, de 28 de diciembre, por el que se establecen las normas básicas de acceso y provisión de puestos de la Inspección de Educación', 'Todas', 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-27966', 'Visto el Real Decreto 2193/1995, de 28 de diciembre, que regula las normas básicas de la Inspección de Educación, en relación con los artículos 148 a 154 de la Ley Orgánica 2/2006 (LOE-LOMLOE).'),
('Inspección', 'Decreto CLM', 'Decreto 34/2008, de 26 de febrero, por el que se establece la ordenación de la Inspección de Educación de Castilla-La Mancha', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De conformidad con las funciones y atribuciones asignadas en el Decreto 34/2008, de 26 de febrero, por el que se establece la ordenación de la Inspección de Educación de Castilla-La Mancha.'),
('Inspección', 'Orden CLM', 'Orden de 08/04/2008, de la Consejería de Educación y Ciencia, que regula la organización y funcionamiento de la Inspección de Educación de CLM', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'En virtud de lo dispuesto en la Orden de 08/04/2008, reguladora de la organización y funcionamiento de la Inspección General y los Servicios Provinciales de Inspección en Castilla-La Mancha.'),
('Inspección', 'Resolución / Instrucciones', 'Resolución anual de la Viceconsejería de Educación por la que se aprueba el Plan General de Actuación y las Instrucciones de la Inspección de Educación', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'En cumplimiento de las actuaciones prioritarias previstas en la Resolución anual por la que se aprueba el Plan General de Actuación de la Inspección de Educación de Castilla-La Mancha.'),
('Autoridad y Convivencia', 'Ley Autonómica', 'Ley 3/2012, de 10 de mayo, de autoridad del profesorado en Castilla-La Mancha', 'Todas', 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-10620', 'Al amparo de la Ley 3/2012, de 10 de mayo, de autoridad del profesorado, que reconoce la presunción de veracidad y protección jurídica del docente en el ejercicio de sus funciones.'),
('Autoridad y Convivencia', 'Decreto CLM', 'Decreto 13/2013, de 21 de marzo, de autoridad del profesorado en Castilla-La Mancha', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'Conforme al procedimiento y medidas contempladas en el Decreto 13/2013, de 21 de marzo, de autoridad del profesorado en Castilla-La Mancha.'),
('Autoridad y Convivencia', 'Decreto CLM', 'Decreto 3/2008, de 8 de enero, de la Convivencia Escolar en Castilla-La Mancha', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'Según lo regulado en el Decreto 3/2008, de 8 de enero, de la Convivencia Escolar en Castilla-La Mancha y los protocolos vigentes de actuación.'),
('Inicio de Curso y Organización', 'Orden CLM', 'Orden 104/2026, por la que se dictan instrucciones de inicio y organización del curso escolar en Castilla-La Mancha', 'Todas', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De acuerdo con lo preceptuado en la Orden 104/2026, por la que se dictan las instrucciones sobre el comienzo y desarrollo del curso escolar en los centros docentes no universitarios de Castilla-La Mancha.'),
('Inicio de Curso y Organización', 'Orden CLM', 'Orden 121/2022, de regulación de la organización y el funcionamiento de los centros públicos de Infantil y Primaria (CEIP) en CLM', 'Infantil y Primaria', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'Atendiendo a la Orden 121/2022, de regulación de la organización y el funcionamiento de los centros públicos que imparten enseñanzas de Educación Infantil y Primaria en Castilla-La Mancha.'),
('Inicio de Curso y Organización', 'Orden CLM', 'Orden 118/2022, de regulación de la organización y el funcionamiento de los Institutos de Educación Secundaria (IES) en CLM', 'Secundaria, Bachillerato y FP', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'Atendiendo a la Orden 118/2022, de regulación de la organización y el funcionamiento de los centros públicos que imparten Educación Secundaria Obligatoria, Bachillerato y Formación Profesional en Castilla-La Mancha.'),
('Evaluación', 'Orden CLM', 'Orden 184/2022, por la que se regula la evaluación en la etapa de Educación Infantil en Castilla-La Mancha', 'Educación Infantil', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De conformidad con la Orden 184/2022, reguladora de la evaluación en la etapa de Educación Infantil en la Comunidad Autónoma de Castilla-La Mancha (en desarrollo del Decreto 80/2022).'),
('Evaluación', 'Orden CLM', 'Orden 185/2022, por la que se regula la evaluación en la etapa de Educación Primaria en Castilla-La Mancha', 'Educación Primaria', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De conformidad con la Orden 185/2022, por la que se regula la evaluación en la etapa de Educación Primaria en Castilla-La Mancha (en desarrollo del Decreto 81/2022).'),
('Evaluación', 'Orden CLM', 'Orden 186/2022, por la que se regula la evaluación en la etapa de Educación Secundaria Obligatoria en Castilla-La Mancha', 'ESO', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De conformidad con la Orden 186/2022, por la que se regula la evaluación en Educación Secundaria Obligatoria en Castilla-La Mancha (en desarrollo del Decreto 82/2022).'),
('Evaluación', 'Orden CLM', 'Orden 187/2022, por la que se regula la evaluación en la etapa de Bachillerato en Castilla-La Mancha', 'Bachillerato', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'De conformidad con la Orden 187/2022, por la que se regula la evaluación en la etapa de Bachillerato en Castilla-La Mancha (en desarrollo del Decreto 83/2022).'),
('Evaluación', 'Orden CLM', 'Normativa autonómica de evaluación y acreditación en Formación Profesional en Castilla-La Mancha', 'Formación Profesional', 'https://educacion.castillalamancha.es/biblioteca-normativa', 'Según lo dispuesto en la normativa reguladora de la evaluación y ordenación de las enseñanzas de Formación Profesional en Castilla-La Mancha.');

INSERT INTO public.centros (codigo_centro, nombre, tipo_centro, localidad, email_centro, telefono, director_nombre, jefe_estudios_nombre, secretario_nombre) VALUES
('02000477','CEIP Francisco Giner de los Ríos','CEIP','Albacete','02000477.cp@edu.jccm.es','967 22 33 44','Pendiente de completar','Pendiente de completar','Pendiente de completar'),
('02003016','IES Virrey Morcillo','IES','Villarrobledo','02003016.ies@edu.jccm.es','967 14 11 22','Pendiente de completar','Pendiente de completar','Pendiente de completar'),
('02000660','IES Bachiller Sabuco','IES','Albacete','02000660.ies@edu.jccm.es','967 21 22 33','Pendiente de completar','Pendiente de completar','Pendiente de completar');

INSERT INTO public.tramites (numero_registro, origen, remitente, centro_id, asunto, descripcion_entrada, tipo_actuacion, plazo_dias, fecha_entrada, fecha_limite, prioridad, estado)
SELECT 'NI-2026/0142','Nota Interior','Jefatura del Servicio de Inspección', id, 'Informe sobre horario lectivo del profesorado','Solicitud de informe sobre la distribución horaria.','Informe Nota Interior',10, CURRENT_DATE - 3, CURRENT_DATE + 7,'Media','En estudio' FROM public.centros WHERE codigo_centro='02000477';
INSERT INTO public.tramites (numero_registro, origen, remitente, centro_id, asunto, descripcion_entrada, tipo_actuacion, plazo_dias, fecha_entrada, fecha_limite, prioridad, estado)
SELECT 'RE-2026/0311','Reclamación','Familia de alumno/a de 2º ESO', id, 'Reclamación de calificación final','Reclamación urgente sobre calificación.','Informe Específico',2, CURRENT_DATE - 1, CURRENT_DATE + 1,'Alta','Pendiente' FROM public.centros WHERE codigo_centro='02003016';

INSERT INTO public.agenda_eventos (titulo, tipo_evento, centro_id, fecha_inicio, realizada)
SELECT 'Visita de supervisión PGA', 'Visita a Centro', id, (CURRENT_DATE + 4 + time '10:00') AT TIME ZONE 'Europe/Madrid', false FROM public.centros WHERE codigo_centro='02000660';
INSERT INTO public.agenda_eventos (titulo, tipo_evento, fecha_inicio, realizada)
VALUES ('Reunión del Servicio de Inspección', 'Reunión Inspección', (CURRENT_DATE + 2 + time '12:00') AT TIME ZONE 'Europe/Madrid', false);