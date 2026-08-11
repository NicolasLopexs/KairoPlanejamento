-- Popula o primeiro cliente: Samhia Simão (cronograma de agosto/2026)
-- Rode depois de schema.sql, no SQL Editor do Supabase.

with novo_cliente as (
  insert into public.clients (name, slug)
  values ('Samhia Simão', 'samhia-simao')
  returning id
)
insert into public.feed_posts (client_id, post_date, weekday, week_label, format, pillar, tema, legenda, status)
select id, v.post_date, v.weekday, v.week_label, v.format, v.pillar, v.tema, v.legenda, 'planejado'
from novo_cliente, (values
  ('2026-08-04'::date, 'Terça',  'Semana 1', 'Reels',     'Jogo',
    'Bastidores do treino: um dia na rotina da Samhia no clube fora do país',
    'De olho na rotina? 👀 Comenta aqui o que você quer ver nos próximos bastidores!'),
  ('2026-08-07'::date, 'Sexta',  'Semana 1', 'Carrossel', 'Lifestyle',
    'Conhecendo a cidade: cultura local, comida e curiosidades de onde ela mora',
    'Já sabia que [curiosidade da cidade]? Salva esse post e me conta se quer mais posts assim!'),
  ('2026-08-11'::date, 'Terça',  'Semana 2', 'Reels',     'Jogo',
    'Melhores lances e gols da última partida',
    'Qual lance foi o seu favorito? Comenta o número! ⚽🔥'),
  ('2026-08-14'::date, 'Sexta',  'Semana 2', 'Carrossel', 'Inspiração',
    'Trajetória: dos primeiros passos no futebol até jogar fora do país (7 anos de carreira)',
    'De onde eu vim até onde eu cheguei 💪 Marca aquela amiga que também sonha alto.'),
  ('2026-08-18'::date, 'Terça',  'Semana 3', 'Reels',     'Bastidores',
    'Preparação pré-jogo: ritual, mala, viagem até o estádio',
    'Assim é o meu antes de jogo! Qual parte da rotina você não sabia? Comenta 👇'),
  ('2026-08-21'::date, 'Sexta',  'Semana 3', 'Carrossel', 'Engajamento',
    'Caixinha de perguntas respondida — Q&A com os seguidores',
    'Vocês perguntaram, eu respondi! Manda mais perguntas nos stories para o próximo Q&A.'),
  ('2026-08-25'::date, 'Terça',  'Semana 4', 'Reels',     'Jogo',
    'Compilado de jogadas e habilidades da semana',
    'Semana de treino pesado rendeu isso aqui 🔥 Bora treinar junto essa semana?'),
  ('2026-08-28'::date, 'Sexta',  'Semana 4', 'Carrossel', 'Lifestyle',
    'Rotina de treino físico e alimentação de uma atleta de alto rendimento',
    'Assim eu me preparo fora de campo. Quer um post só sobre alimentação? Comenta!')
) as v(post_date, weekday, week_label, format, pillar, tema, legenda);

insert into public.stories_template (client_id, weekday, tipo, ideia, sort_order)
select id, v.weekday, v.tipo, v.ideia, v.sort_order
from (select id from public.clients where slug = 'samhia-simao') c, (values
  ('Segunda',  'Bastidor',                       'Início da semana de treinos / planos da semana', 1),
  ('Terça',    'Divulgação do post do feed',      'Reforçar o Reels/Carrossel publicado no dia', 2),
  ('Quarta',   'Enquete/Interação',               'Enquete simples sobre treino, jogo ou dia a dia', 3),
  ('Quinta',   'Bastidor',                        'Momento de treino, viagem ou rotina fora de campo', 4),
  ('Sexta',    'Divulgação do post do feed',      'Reforçar o Carrossel/Reels publicado no dia', 5),
  ('Sábado',   'Jogo/Pré-jogo (quando houver)',   'Contagem regressiva, chegada ao estádio, aquecimento', 6),
  ('Domingo',  'Lifestyle',                       'Descanso, cultura local, momento pessoal (leve)', 7)
) as v(weekday, tipo, ideia, sort_order);

insert into public.capture_guide (client_id, momento, detalhe, sort_order)
select id, v.momento, v.detalhe, v.sort_order
from (select id from public.clients where slug = 'samhia-simao') c, (values
  ('Treinos',          'Vídeos curtos (10–20s) de exercícios, aquecimento, sorrisos com o time, ângulo horizontal e vertical', 1),
  ('Jogos',             'Chegada ao estádio, aquecimento, lances (se permitido), comemorações, vestiário (autorizado pelo clube)', 2),
  ('Viagens',           'Deslocamentos, aeroporto, hotel, chegada à cidade — clipes curtos, boa iluminação natural', 3),
  ('Cidade/Cultura',    'Pontos turísticos, comida local, idioma/curiosidades, mercado ou rua típica', 4),
  ('Rotina diária',     'Café da manhã, preparação de mala, momentos de descanso, alimentação', 5),
  ('Qualidade técnica', 'Preferir vídeo horizontal em boa luz para Reels; fotos em alta resolução; evitar tremidos', 6)
) as v(momento, detalhe, sort_order);
