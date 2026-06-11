import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function requireSupabase() {
  if (!supabase) {
    throw new AuthError(
      'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local',
    );
  }
  return supabase;
}

export async function signUpOwner(params: {
  email: string;
  password: string;
  fullName: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName },
    },
  });

  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError('No se pudo crear la cuenta.');

  return data;
}

export async function ensureOwnerAccountAfterVerification(params: {
  email: string;
  password: string;
  fullName: string;
}) {
  const client = requireSupabase();
  const normalizedEmail = params.email.trim().toLowerCase();
  const { data: sessionData } = await client.auth.getSession();
  const sessionUser = sessionData.session?.user;

  if (sessionUser && sessionUser.email?.toLowerCase() === normalizedEmail) {
    const { data, error } = await client.auth.updateUser({
      password: params.password,
      data: { full_name: params.fullName },
    });

    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError('No se pudo completar la cuenta del propietario.');

    return { user: data.user };
  }

  return signUpOwner(params);
}

export async function signUpEmployee(params: {
  email: string;
  password: string;
  fullName: string;
  cargo: string;
  inviteCode: string;
}) {
  const client = requireSupabase();

  const { data: orgId, error: orgError } = await client.rpc('validate_invite_code', {
    code: params.inviteCode,
  });

  if (orgError) throw new AuthError(orgError.message);
  if (!orgId) throw new AuthError('Código de invitación inválido. Pide el código a tu empleador.');

  const { data, error } = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName },
    },
  });

  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError('No se pudo crear la cuenta de empleado.');

  const { error: profileError } = await client.from('profiles').insert({
    id: data.user.id,
    full_name: params.fullName,
    email: params.email,
    role: 'employee',
    organization_id: orgId,
    cargo: params.cargo,
  });

  if (profileError) throw new AuthError(profileError.message);

  return { user: data.user, organizationId: orgId };
}

export async function signIn(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) throw new AuthError(error.message);
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id, cargo')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new AuthError(error.message);
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name ?? '',
    email: data.email,
    role: data.role as 'owner' | 'employee',
    organizationId: data.organization_id,
    cargo: data.cargo ?? undefined,
  };
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export { isSupabaseConfigured };
