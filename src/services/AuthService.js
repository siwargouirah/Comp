import { supabase } from './supabaseClient';

export const AuthService = {
  // Helper to generate a unique teacher ID
  generateTeacherId: () => {
    return 'TCH-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  },

  // Signup Parent
  signUpParent: async (username, email, password, phoneNumber) => {
    // 1. Sign up user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Parent signup failed.");

    // 2. Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        email,
        role: 'parent',
        phone_number: phoneNumber
      });

    if (profileError) throw profileError;
    return authData.user;
  },

  // Signup Teacher
  signUpTeacher: async (username, email, password) => {
    // 1. Sign up user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Teacher signup failed.");

    // Generate unique ID
    const teacherId = AuthService.generateTeacherId();

    // 2. Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        email,
        role: 'teacher',
        teacher_id: teacherId
      });

    if (profileError) throw profileError;
    return { user: authData.user, teacherId };
  },

  // Signup Child
  signUpChild: async (username, password) => {
    // Since children don't need real emails, we generate a dummy one under the hood
    const dummyEmail = `${username.toLowerCase()}@aura-child.com`;

    // 1. Sign up user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dummyEmail,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Child signup failed.");

    // 2. Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        email: dummyEmail,
        role: 'child'
      });

    if (profileError) throw profileError;
    return authData.user;
  },

  // Login (Universal: works with username or email)
  login: async (usernameOrEmail, password) => {
    let email = usernameOrEmail;

    // If it's a username (no '@'), look up the email from the profiles table
    if (!usernameOrEmail.includes('@')) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', usernameOrEmail)
        .maybeSingle();

      if (error || !data) {
        throw new Error("User profile not found.");
      }
      email = data.email;
    }

    // Sign in
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) throw loginError;

    // Get user profile role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    return { user: authData.user, profile };
  },

  // Link Parent to Teacher and Child
  linkParentToTeacherAndChild: async (parentId, teacherId, childUsername) => {
    // 1. Find child profile by username
    const { data: childProfile, error: childError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', childUsername)
      .eq('role', 'child')
      .maybeSingle();

    if (childError || !childProfile) {
      throw new Error("Child username not found. Please ensure your child has created an account first.");
    }

    // 2. Verify teacher ID exists by checking if a teacher profile has it
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('profiles')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle();

    if (teacherError || !teacherProfile) {
      throw new Error("Teacher ID not found. Please verify the code with your teacher.");
    }

    // 3. Update the parent profile with teacher_id and child_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        teacher_id: teacherId,
        child_id: childProfile.id
      })
      .eq('id', parentId);

    if (updateError) throw updateError;
    return { childId: childProfile.id };
  },

  // Get Current Session & Profile
  getCurrentUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return { user: session.user, profile };
  },

  // Signout
  signOut: async () => {
    await supabase.auth.signOut();
  }
};
