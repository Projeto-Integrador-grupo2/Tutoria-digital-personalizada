-- CAMINHO LEGADO DESATIVADO NA VERSÃO 1.2.0-rc.1.
-- Use backend/supabase/migrations/ em um projeto Supabase separado.
-- O schema antigo não implementava isolamento adequado do histórico.
-- Não misture as duas arquiteturas nem remova dados existentes automaticamente.
do $$ begin
  raise exception 'Arquivo legado: consulte README.md e aplique as migrações de backend/supabase/migrations/ em homologação.';
end $$;
