-- Executar somente no SQL Editor administrativo, após instalar 06_cadastro_controlado.sql.
-- Substitua o texto abaixo pelo e-mail do participante autorizado, sem compartilhar senha.
do $$
declare
  authorized_email text := 'COLOQUE_AQUI_O_EMAIL_AUTORIZADO';
begin
  authorized_email := lower(btrim(authorized_email));
  if authorized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(authorized_email) > 254 then
    raise exception 'Substitua o marcador por um e-mail autorizado válido antes de executar.';
  end if;
  insert into tutor_private.signup_approvals(email_hash, expires_at)
  values (encode(sha256(convert_to(authorized_email, 'UTF8')), 'hex'), now() + interval '30 days')
  on conflict (email_hash) do update set expires_at = excluded.expires_at;
end;
$$;

select count(*) as autorizacoes_vigentes
from tutor_private.signup_approvals where expires_at > now();
