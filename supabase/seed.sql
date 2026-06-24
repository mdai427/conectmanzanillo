insert into public.sections (slug, name, description, icon, sort_order) values
  ('segundo-acceso',   'Segundo Acceso',      'Vialidad secundaria de entrada/salida al puerto',      'route',     1),
  ('confinada',        'Zona Confinada',       'Área de almacenamiento y tránsito restringido',        'lock',      2),
  ('terminal-ictsi',   'Terminal ICTSI',       'International Container Terminal Services',            'container', 3),
  ('terminal-tmm',     'Terminal TMM',         'Terminal Marítima Mexicana',                           'ship',      4),
  ('patio-fiscal',     'Patio Fiscal',         'Contenedores bajo régimen fiscal aduanal',             'warehouse', 5),
  ('acceso-principal', 'Acceso Principal',     'Entrada principal al recinto portuario',               'door-open', 6),
  ('libramiento',      'Libramiento',          'Carretera de libramiento hacia y desde el puerto',     'truck',     7),
  ('vialidad-interna', 'Vialidad Interna',     'Calles de circulación dentro del recinto portuario',   'map-pin',   8);

insert into public.section_status_cache (section_id, current_status, active_reports, confidence)
select id, 'free', 0, 0 from public.sections;
