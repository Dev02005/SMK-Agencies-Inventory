-- Starter data for a new Supabase project (staging). Rates and the Sri Rajarajeswari party come from
-- the May 2023 SKA quotation; replace with the client's data sheets before go-live.

insert into public.firms (id, name, gstin, address) values
  ('00000000-0000-0000-0000-000000000001', 'Sri Kameswari Agencies', '37AELPP5465R1ZE', 'Polaki 532 429, Srikakulam Dist. (A.P.)');

insert into public.godowns (firm_id, name, place) values
  ('00000000-0000-0000-0000-000000000001', 'Polaki godown', 'Polaki');

insert into public.products (name, category, unit, list_rate) values
  ('Deccan OPC', 'cement', 'bag', 360),
  ('MS iron Vishaka', 'steel', 'kg', 70);

insert into public.parties (name, kind, place, gstin, credit_limit, opening_balance) values
  ('Cash customer', 'cash', null, null, null, 0),
  ('Sri Rajarajeswari Agencies', 'customer', 'Srikurmam', '37AEPPK7944C1Z6', 500000, 420000);
