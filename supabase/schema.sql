-- NxtWave Arena schema. Paste the whole file into Supabase > SQL Editor > Run.
-- CHANGE the two values marked below before running.
create table settings(key text primary key, value text not null);
insert into settings values ('phase','recruit'),('season','1'),
 ('workshop_code','NXT60'),      -- CHANGE: the check-in code you show during the workshop
 ('admin_pass','change-me-now'); -- CHANGE: your private admin passcode

create table colleges(id text primary key, name text not null, city text, logo_url text, created_at timestamptz default now());
create table members(id uuid primary key default gen_random_uuid(), college_id text not null references colleges(id),
 name text not null, phone text unique not null check (phone ~ '^[0-9]{10}$'), is_captain boolean default false,
 referred_by uuid references members(id), attended boolean default false, shipped boolean default false, project_url text, created_at timestamptz default now());
create table members_archive as select * from members where false;
alter table members_archive add column season int;
create table hall(season int primary key, data jsonb not null, created_at timestamptz default now());

-- Lock every table: the website can only use the functions below. Phone numbers are never readable from the browser.
alter table settings enable row level security; alter table colleges enable row level security; alter table members enable row level security;
alter table members_archive enable row level security; alter table hall enable row level security;

-- The 5 starting colleges (names only, zero members).
insert into colleges(id,name,city) values
 ('lpu','Lovely Professional University','Phagwara'),('chandigarh-university','Chandigarh University','Mohali'),
 ('thapar','Thapar Institute','Patiala'),('gndec','Guru Nanak Dev Engineering College','Ludhiana'),('nit-jalandhar','NIT Jalandhar','Jalandhar');

create function get_arena() returns json language sql security definer set search_path=public as $$
 select json_build_object(
  'phase',(select value from settings where key='phase'),
  'season',(select value::int from settings where key='season'),
  'colleges',(select coalesce(json_agg(c order by c.created_at),'[]'::json) from (select id,name,city,logo_url,created_at from colleges) c),
  'members',(select coalesce(json_agg(m),'[]'::json) from (select id,college_id,name,is_captain,referred_by,attended,shipped,created_at from members) m),
  'hall',(select coalesce(json_agg(h order by h.season desc),'[]'::json) from hall h));
$$;

create function join_arena(p_name text,p_phone text,p_college text,p_ref uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid; begin
 select id into mid from members where phone=p_phone; if mid is not null then return mid; end if;
 if length(trim(p_name))<2 then raise exception 'Enter your name.'; end if;
 if p_phone !~ '^[0-9]{10}$' then raise exception 'Phone must be 10 digits.'; end if;
 if not exists(select 1 from colleges where id=p_college) then raise exception 'College not found.'; end if;
 insert into members(college_id,name,phone,is_captain,referred_by)
 values(p_college,trim(p_name),p_phone,not exists(select 1 from members where college_id=p_college),(select id from members where id=p_ref))
 returning id into mid; return mid; end $$;

create function login_arena(p_phone text) returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid; begin select id into mid from members where phone=p_phone;
 if mid is null then raise exception 'No account for this phone. Join a squad first.'; end if; return mid; end $$;

create function create_college(p_name text,p_city text,p_logo text,p_who text,p_phone text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid text; begin
 if length(trim(p_name))<3 then raise exception 'Enter the full college name.'; end if;
 if exists(select 1 from members where phone=p_phone) then raise exception 'This phone already has an account. Use Sign in.'; end if;
 cid:=trim(both '-' from regexp_replace(lower(p_name),'[^a-z0-9]+','-','g'));
 if exists(select 1 from colleges where id=cid or lower(name) like '%'||lower(trim(p_name))||'%' or lower(trim(p_name)) like '%'||lower(name)||'%')
  then raise exception 'A squad for this college already exists. Join it instead.'; end if;
 insert into colleges(id,name,city,logo_url) values(cid,trim(p_name),nullif(trim(p_city),''),nullif(trim(p_logo),''));
 return join_arena(p_who,p_phone,cid,null); end $$;

create function check_in(p_member uuid,p_code text) returns void language plpgsql security definer set search_path=public as $$
begin
 if (select value from settings where key='phase')<>'war' then raise exception 'Check-in opens on War Day.'; end if;
 if upper(trim(p_code))<>upper((select value from settings where key='workshop_code')) then raise exception 'Wrong code. Use the code shown in the workshop.'; end if;
 update members set attended=true where id=p_member; end $$;

create function ship_project(p_member uuid,p_url text) returns void language plpgsql security definer set search_path=public as $$
begin
 if (select value from settings where key='phase')<>'war' then raise exception 'Shipping opens on War Day.'; end if;
 if not coalesce((select attended from members where id=p_member),false) then raise exception 'Check in first, then ship.'; end if;
 if p_url !~ '^https://.{4,}' then raise exception 'Paste a live link that starts with https://'; end if;
 update members set shipped=true,project_url=p_url where id=p_member; end $$;

create function admin_phase(p_pass text,p_phase text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_pass<>(select value from settings where key='admin_pass') then raise exception 'Wrong admin passcode.'; end if;
 if p_phase not in ('recruit','war') then raise exception 'Bad phase.'; end if;
 update settings set value=p_phase where key='phase'; end $$;

create function admin_close_season(p_pass text,p_hall jsonb) returns void language plpgsql security definer set search_path=public as $$
declare s int; begin
 if p_pass<>(select value from settings where key='admin_pass') then raise exception 'Wrong admin passcode.'; end if;
 select value::int into s from settings where key='season';
 insert into hall(season,data) values(s,p_hall);
 insert into members_archive select m.*,s from members m;
 delete from members;
 update settings set value=(s+1)::text where key='season'; update settings set value='recruit' where key='phase'; end $$;
