-- Users profile table (extends Supabase Auth)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  avatar_url text
);

alter table public.users enable row level security;

create policy "Users can read other users" on public.users
  for select using (true);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Workspaces
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

alter table public.workspaces enable row level security;

-- Workspace members
create table public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create policy "Members can read their workspaces" on public.workspaces
  for select using (
    id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

create policy "Owners can update workspace" on public.workspaces
  for update using (owner_id = auth.uid());

create policy "Authenticated users can create workspaces" on public.workspaces
  for insert with check (auth.uid() = owner_id);

create policy "Owners can delete workspace" on public.workspaces
  for delete using (owner_id = auth.uid());

create policy "Members can read membership" on public.workspace_members
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

create policy "Owners and editors can manage members" on public.workspace_members
  for all using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

-- Folders
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  position int not null default 0
);

alter table public.folders enable row level security;

create policy "Members can read folders" on public.folders
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

create policy "Editors and owners can manage folders" on public.folders
  for all using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

-- Documents
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  folder_id uuid references public.folders(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null default 'Untitled',
  yjs_state bytea,
  created_by uuid references public.users(id) on delete set null not null,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.documents enable row level security;

create policy "Members can read documents" on public.documents
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

create policy "Editors and owners can manage documents" on public.documents
  for all using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );
