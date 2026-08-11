-- Modelo para cadastrar um novo cliente com o guia de stories e a orientação de
-- captação já preenchidos com o padrão que usamos com a Samhia (edite os textos
-- conforme o esporte/perfil de cada cliente antes de rodar).
--
-- Troque 'SLUG-DO-CLIENTE' pelo slug do cliente (o mesmo que aparece na URL
-- /clientes/SLUG-DO-CLIENTE — normalmente criado pelo painel "Adicionar cliente").

insert into public.stories_template (client_id, weekday, tipo, ideia, sort_order)
select id, v.weekday, v.tipo, v.ideia, v.sort_order
from (select id from public.clients where slug = 'SLUG-DO-CLIENTE') c, (values
  ('Segunda',  'Bastidor',                     'Início da semana / planos da semana', 1),
  ('Terça',    'Divulgação do post do feed',    'Reforçar o conteúdo publicado no dia', 2),
  ('Quarta',   'Enquete/Interação',             'Enquete simples sobre o dia a dia', 3),
  ('Quinta',   'Bastidor',                      'Momento de rotina fora do trabalho/treino', 4),
  ('Sexta',    'Divulgação do post do feed',    'Reforçar o conteúdo publicado no dia', 5),
  ('Sábado',   'Evento (quando houver)',        'Contagem regressiva, chegada, preparação', 6),
  ('Domingo',  'Lifestyle',                     'Descanso, momento pessoal (leve)', 7)
) as v(weekday, tipo, ideia, sort_order);

insert into public.capture_guide (client_id, momento, detalhe, sort_order)
select id, v.momento, v.detalhe, v.sort_order
from (select id from public.clients where slug = 'SLUG-DO-CLIENTE') c, (values
  ('Rotina diária',     'Momentos do dia a dia — vídeos curtos, boa iluminação natural', 1),
  ('Qualidade técnica', 'Preferir vídeo horizontal em boa luz; fotos em alta resolução; evitar tremidos', 2)
) as v(momento, detalhe, sort_order);
