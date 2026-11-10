<template>
  <ion-page>
    <ion-content class="signup-page" fullscreen>
      <div class="signup-wrapper">
        <div class="signup-card">
          <!-- LEFT: FORM PANEL -->
          <section class="form-panel">
            <div class="form-panel-inner">
              <div class="brand-row">
                <div class="brand-badge">R</div>
                <div class="brand-copy">
                  <h2>RentEase</h2>
                  <p>OWNER • TENANT • ADMIN</p>
                </div>
                <ThemeToggle class="brand-theme-toggle" />
              </div>

              <div class="form-copy">
                <span class="eyebrow">CREATE ACCOUNT</span>
                <h1>SIGN UP</h1>
                <p class="intro">
                  Start your rental journey with a modern platform built for
                  tenants and property owners.
                </p>
              </div>

              <form class="signup-form" @submit.prevent="handleSignup">
                <div class="field-group">
                  <label for="fullName">Full name</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.8-3.7 4.8-5.5 8-5.5s6.2 1.8 8 5.5" />
                      </svg>
                    </span>
                    <input
                      id="fullName"
                      v-model="fullName"
                      type="text"
                      placeholder="e.g. Glay Soriano"
                      maxlength="100"
                      autocomplete="name"
                      :disabled="isLoading"
                      required
                    />
                  </div>
                </div>

                <div class="field-group">
                  <label for="email">E-mail</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="3" />
                        <path d="M4 7l8 6 8-6" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      v-model="email"
                      type="email"
                      placeholder="you@example.com"
                      autocomplete="email"
                      :disabled="isLoading"
                      required
                    />
                  </div>
                </div>

                <div class="field-row">
                  <div class="field-group">
                    <div class="label-row">
                      <label for="password">Password</label>
                      <span class="mini-hint">Minimum 8 characters</span>
                    </div>

                    <div class="input-shell">
                      <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="10" rx="2.8" />
                          <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" />
                        </svg>
                      </span>
                      <input
                        id="password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Create password"
                        autocomplete="new-password"
                        minlength="8"
                        :disabled="isLoading"
                        @input="errorMessage = ''"
                        required
                      />
                      <button
                        type="button"
                        class="input-action"
                        @click="showPassword = !showPassword"
                        :disabled="isLoading"
                      >
                        {{ showPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>

                    <div
                      v-if="password.length > 0"
                      class="password-strength"
                    >
                      <div class="strength-bars">
                        <span
                          v-for="bar in 4"
                          :key="bar"
                          :class="{ filled: passwordScore >= bar }"
                        ></span>
                      </div>
                      <p :class="passwordStrengthClass">
                        {{ passwordStrength }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="field-group">
                  <label for="confirmPassword">Confirm password</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="4" y="10" width="16" height="10" rx="2.8" />
                        <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" />
                        <path d="M10 15h4" />
                      </svg>
                    </span>
                    <input
                      id="confirmPassword"
                      v-model="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      placeholder="Re-enter password"
                      autocomplete="new-password"
                      :disabled="isLoading"
                      required
                    />
                    <button
                      type="button"
                      class="input-action"
                      @click="showConfirmPassword = !showConfirmPassword"
                      :disabled="isLoading"
                    >
                      {{ showConfirmPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </div>

                <div class="field-group">
                  <label>Choose account type</label>
                  <div class="role-grid">
                    <button
                      type="button"
                      class="role-card"
                      :class="{ selected: selectedRole === 'tenant' }"
                      @click="selectedRole = 'tenant'"
                      :disabled="isLoading"
                    >
                      <span class="role-icon tenant">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 11.5 12 4l9 7.5" />
                          <path d="M5 10.5V20h14v-9.5" />
                          <path d="M9 20v-5h6v5" />
                        </svg>
                      </span>
                      <span class="role-text">
                        <strong>Tenant</strong>
                        <small>Browse and apply for a unit</small>
                      </span>
                      <span class="role-check"></span>
                    </button>

                    <button
                      type="button"
                      class="role-card"
                      :class="{ selected: selectedRole === 'owner' }"
                      @click="selectedRole = 'owner'"
                      :disabled="isLoading"
                    >
                      <span class="role-icon owner">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="3" width="14" height="18" rx="2" />
                          <path
                            d="M9 7h2M9 11h2M9 15h2M15 7h.01M15 11h.01M15 15h.01M10 21v-3h4v3"
                          />
                        </svg>
                      </span>
                      <span class="role-text">
                        <strong>Property Owner</strong>
                        <small>Manage properties and tenants</small>
                      </span>
                      <span class="role-check"></span>
                    </button>
                  </div>
                </div>

                <label class="terms-box">
                  <input
                    v-model="agreeTerms"
                    type="checkbox"
                    :disabled="isLoading"
                  />
                  <span class="terms-mark"></span>
                  <span class="terms-copy">
                    I agree to the
                    <a href="#" @click.prevent>terms of service</a>.
                    <template v-if="selectedRole === 'owner'">
                      An administrator must verify an owner account before sign-in and property publishing.
                    </template>
                    <template v-else>
                      A tenant account can sign in immediately after registration.
                    </template>
                  </span>
                </label>

                <div
                  v-if="errorMessage"
                  class="message-box error"
                  role="alert"
                >
                  <span class="message-icon">!</span>
                  <div>
                    <strong>Registration failed</strong>
                    <p>{{ errorMessage }}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  class="submit-button"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading" class="spinner"></span>
                  <span class="submit-copy">
                    {{
                      isLoading
                        ? 'Creating your account...'
                        : 'Create Account'
                    }}
                  </span>
                  <span v-if="!isLoading" class="submit-arrow">→</span>
                </button>
                <GoogleContinue
                  :key="googleKey"
                  intent="register"
                  :role="selectedRole"
                  :disabled="!agreeTerms || isLoading"
                  @error="message => errorMessage = message"
                  @pending="finishGoogleRegistration"
                  @success="openDashboard"
                />

                <p class="login-note">
                  Already have an account?
                  <router-link to="/login">Sign in</router-link>
                </p>
              </form>
            </div>
          </section>

          <!-- RIGHT: HERO PANEL -->
          <section class="visual-panel">
            <div class="visual-overlay"></div>

            <div class="floating-card top-card">
              <div class="mini-icon home">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path d="M5 10.5V20h14v-9.5" />
                  <path d="M9 20v-5h6v5" />
                </svg>
              </div>
              <div>
                <strong>Verified Listings</strong>
                <small>Trusted rental options</small>
              </div>
            </div>

            <div class="visual-content">
              <span class="visual-badge">RENT WITH EASE</span>
              <h2>Find your next home or manage your properties better.</h2>
              <p>
                RentEase helps tenants discover spaces and allows property
                owners to manage applications, leases, billing, and maintenance
                in one connected platform.
              </p>

              <div class="visual-stats">
                <div class="stat-card">
                  <strong>Smart Applications</strong>
                  <span>Track rental applications smoothly</span>
                </div>
                <div class="stat-card">
                  <strong>Owner Tools</strong>
                  <span>Manage units, billing, and tenants</span>
                </div>
                <div class="stat-card">
                  <strong>One Portal</strong>
                  <span>All your rental activities in one place</span>
                </div>
              </div>
            </div>

            <div class="property-showcase">
              <div class="property-card featured">
                <div class="property-image large">
                  <img
                    :src="getPropertyPhoto(1, 'Modern City Apartment')"
                    alt="Modern City Apartment"
                    class="featured-property-photo"
                    loading="lazy"
                  />
                </div>
                <div class="property-info">
                  <div class="property-tag">Featured rental</div>
                  <h3>Modern City Apartment</h3>
                  <p>Comfortable living spaces for modern renters.</p>
                  <div class="property-meta">
                    <span>✔ Flexible living</span>
                    <span>✔ Verified management</span>
                  </div>
                </div>
              </div>

              <div class="bottom-mini-cards">
                <div class="mini-property">
                  <div class="mini-thumb one">
                    <img
                      :src="getUnitPhoto(1, 'Easy leasing')"
                      alt="Modern studio unit"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <strong>Easy leasing</strong>
                    <small>Fast and secure workflow</small>
                  </div>
                </div>

                <div class="mini-property">
                  <div class="mini-thumb two">
                    <img
                      :src="getUnitPhoto(2, 'Property dashboard')"
                      alt="Modern apartment living room"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <strong>Property dashboard</strong>
                    <small>Built for owners and tenants</small>
                  </div>
                </div>
              </div>
            </div>

            <div class="visual-footer">
              <span>MOVE IN WITH CONFIDENCE</span>
              <span>© {{ currentYear }} RentEase</span>
            </div>
          </section>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue';
import { API_BASE_URL } from '@/services/apiBase';
import { dashboardPath, type AuthUser } from '@/services/auth';
import GoogleContinue from '@/components/auth/GoogleContinue.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getPropertyPhoto, getUnitPhoto } from '@/services/propertyPhotos';

const router = useRouter();

const fullName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const selectedRole = ref<'tenant' | 'owner'>('tenant');
const isLoading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const agreeTerms = ref(false);
const googleKey = ref(0);

function resetSignupForm() {
  fullName.value = '';
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  selectedRole.value = 'tenant';
  isLoading.value = false;
  errorMessage.value = '';
  showPassword.value = false;
  showConfirmPassword.value = false;
  agreeTerms.value = false;
  googleKey.value += 1;
}

onIonViewWillEnter(resetSignupForm);

const currentYear = new Date().getFullYear();

const passwordScore = computed(() => {
  const value = password.value;
  if (!value) return 0;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  return score;
});

const passwordStrength = computed(() => {
  if (password.value.length < 8) return 'Too short';
  if (passwordScore.value <= 1) return 'Weak password';
  if (passwordScore.value === 2) return 'Fair password';
  if (passwordScore.value === 3) return 'Good password';
  return 'Strong password';
});

const passwordStrengthClass = computed(() => {
  if (password.value.length < 8 || passwordScore.value <= 1) {
    return 'strength-weak';
  }
  if (passwordScore.value === 2) return 'strength-fair';
  if (passwordScore.value === 3) return 'strength-good';
  return 'strength-strong';
});

const finishGoogleRegistration = async () => {
  await router.replace({ path: '/login', query: { registered: selectedRole.value } });
};
const openDashboard = async (user: AuthUser) => {
  await router.replace(dashboardPath(user.role));
};
const handleSignup = async () => {
  errorMessage.value = '';

  const trimmedName = fullName.value.trim();
  const normalizedEmail = email.value.trim().toLowerCase();

  if (
    !trimmedName ||
    !normalizedEmail ||
    !password.value ||
    !confirmPassword.value ||
    !selectedRole.value
  ) {
    errorMessage.value = 'Please fill in all required fields.';
    return;
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Your password must contain at least 8 characters.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Password and confirm password do not match.';
    return;
  }

  if (!agreeTerms.value) {
    errorMessage.value =
      'Please agree to the terms of service before creating your account.';
    return;
  }

  if (!['tenant', 'owner'].includes(selectedRole.value)) {
    errorMessage.value = 'Please select a valid account type.';
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: trimmedName,
        email: normalizedEmail,
        password: password.value,
        role: selectedRole.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      await router.replace({
        path: '/login',
        query: { registered: selectedRole.value }
      });
      return;
    }

    errorMessage.value =
      data.message || 'Registration failed. Please try again.';
  } catch (error) {
    console.error('Signup error:', error);
    errorMessage.value =
      'Unable to connect to the server. Please make sure the backend is running.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.signup-page {
  --background:
    radial-gradient(circle at top left, rgba(6, 182, 212, 0.14), transparent 34%),
    radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #f0f6fc 0%, #e8f1fb 45%, #e2edf8 100%);
  color: #0f172a;
  color-scheme: light;
  font-family: 'Plus Jakarta Sans', Inter, "Segoe UI", Arial, sans-serif;
}

.signup-wrapper {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.signup-card {
  position: relative;
  width: 100%;
  max-width: 1320px;
  min-height: 680px;
  display: grid;
  grid-template-columns: minmax(380px, 0.92fr) minmax(460px, 1.08fr);
  border-radius: 30px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #d8e4f2;
  box-shadow:
    0 28px 70px rgba(15, 23, 42, 0.12),
    0 10px 25px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
}

/* LEFT FORM PANEL */
.form-panel {
  position: relative;
  z-index: 2;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.form-panel::after {
  content: "";
  position: absolute;
  top: 0;
  right: -54px;
  width: 120px;
  height: 100%;
  background: inherit;
  clip-path: polygon(0 0, 85% 0, 62% 8%, 96% 18%, 65% 29%, 100% 39%, 70% 50%, 100% 61%, 67% 72%, 95% 82%, 62% 92%, 84% 100%, 0 100%);
  box-shadow: 14px 0 25px rgba(15, 23, 42, 0.08);
}

.form-panel-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 520px;
  padding: 26px 34px 24px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.brand-copy {
  flex: 1;
  min-width: 0;
}

.brand-theme-toggle {
  margin-left: auto;
}

.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #60a5fa;
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(145deg, #091945 0%, #102a71 100%);
  border: 1px solid #1e3a8a;
  box-shadow: 0 10px 22px rgba(16, 42, 113, 0.24);
}

.brand-copy h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 900;
  color: #0b132b;
  letter-spacing: -0.6px;
}

.brand-copy h2::after {
  content: ".";
  color: #0d2d84;
}

.brand-copy p {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.6px;
  color: #64748b;
}

.form-copy {
  margin-bottom: 14px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 11px;
  border-radius: 999px;
  background: #dceeff;
  border: 1px solid #bddaff;
  color: #0f2963;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
  margin-bottom: 10px;
}

.form-copy h1 {
  margin: 0 0 6px;
  font-size: clamp(32px, 3.2vw, 40px);
  line-height: 1;
  color: #0b132b;
  font-weight: 900;
  letter-spacing: -1.5px;
}

.intro {
  margin: 0;
  max-width: 420px;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.signup-form {
  display: block;
}

.field-group {
  margin-bottom: 11px;
}

.field-row {
  display: block;
}

.field-group label {
  display: block;
  margin-bottom: 5px;
  color: #1e293b;
  font-size: 12px;
  font-weight: 800;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mini-hint {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.input-shell {
  display: flex;
  align-items: center;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid #cfe0f5;
  background: #e6f0fa;
  transition: 0.22s ease;
}

.input-shell:focus-within {
  border-color: #0d47ff;
  background: #f2f7fd;
  box-shadow: 0 0 0 4px rgba(13, 71, 255, 0.14);
}

.input-icon {
  width: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #64748b;
}

.input-icon svg,
.role-icon svg,
.mini-icon svg {
  width: 19px;
  height: 19px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-shell input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: none;
  outline: none;
  background: transparent;
  color: #0b132b;
  font-family: inherit;
  font-size: 13px;
  padding: 10px 10px 10px 0;
}

.input-shell input::placeholder {
  color: #64748b;
}

.input-shell input:disabled {
  opacity: 0.68;
}

.input-action {
  border: none;
  background: transparent;
  color: #0d2d84;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  padding: 8px 12px;
  margin-right: 4px;
}

.password-strength {
  margin-top: 7px;
}

.strength-bars {
  display: flex;
  gap: 6px;
}

.strength-bars span {
  height: 5px;
  flex: 1;
  border-radius: 999px;
  background: #dbe5f1;
  transition: 0.2s ease;
}

.strength-bars span.filled:nth-child(1) {
  background: #f43f5e;
}

.strength-bars span.filled:nth-child(2) {
  background: #f59e0b;
}

.strength-bars span.filled:nth-child(3) {
  background: #8b5cf6;
}

.strength-bars span.filled:nth-child(4) {
  background: #06b6d4;
}

.password-strength p {
  margin: 5px 0 0;
  font-size: 11px;
  font-weight: 800;
}

.strength-weak {
  color: #e11d48;
}

.strength-fair {
  color: #d97706;
}

.strength-good {
  color: #7c3aed;
}

.strength-strong {
  color: #0891b2;
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 70px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 15px;
  border: 1px solid #cbd8e8;
  background: #f8fbff;
  text-align: left;
  cursor: pointer;
  transition: 0.22s ease;
}

.role-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #0d47ff;
}

.role-card.selected {
  border-color: #0d47ff;
  background: #e6f0fa;
  box-shadow: 0 0 0 3px rgba(13, 71, 255, 0.14);
}

.role-card:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.role-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #475569;
  background: #dce8f6;
}

.role-icon.tenant {
  background: #0d47ff;
  color: #ffffff;
}

.role-icon.owner {
  background: #7c3aed;
  color: #ffffff;
}

.role-text {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.role-text strong {
  color: #0b132b;
  font-size: 12.5px;
  font-weight: 900;
}

.role-text small {
  color: #475569;
  font-size: 10.5px;
  line-height: 1.35;
}

.role-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: auto;
  border-radius: 50%;
  border: 2px solid #b8c9e0;
  background: #ffffff;
  transition: 0.22s ease;
}

.role-card.selected .role-check {
  border: 5px solid #0d47ff;
}

.terms-box {
  margin: 2px 0 11px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  cursor: pointer;
}

.terms-box input {
  display: none;
}

.terms-mark {
  position: relative;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 5px;
  border: 1.5px solid #94a3b8;
  background: #ffffff;
  transition: 0.2s ease;
}

.terms-box input:checked + .terms-mark {
  background: linear-gradient(135deg, #0033ff, #1a5cff);
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(10, 69, 255, 0.26);
}

.terms-box input:checked + .terms-mark::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  transform: rotate(45deg);
}

.terms-copy {
  color: #475569;
  font-size: 11.5px;
  line-height: 1.45;
}

.terms-copy a {
  color: #0d2d84;
  font-weight: 800;
  text-decoration: none;
}

.terms-copy a:hover {
  text-decoration: underline;
}

.message-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 14px;
  margin-bottom: 12px;
}

.message-box.error {
  border: 1px solid #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

.message-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: rgba(244, 63, 94, 0.16);
  color: #e11d48;
  font-size: 12px;
  font-weight: 900;
}

.message-box strong {
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
  color: #0f172a;
}

.message-box p {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 11px 18px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(90deg, #0033ff 0%, #0a45ff 55%, #1a5cff 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(10, 69, 255, 0.3);
  transition: 0.22s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(10, 69, 255, 0.4);
}

.submit-button:disabled {
  opacity: 0.76;
  cursor: wait;
}

.submit-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.submit-arrow {
  margin-left: auto;
  font-size: 20px;
  line-height: 1;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  animation: spin 0.7s linear infinite;
}

.login-note {
  margin: 12px 0 0;
  text-align: center;
  color: #64748b;
  font-size: 12.5px;
}

.login-note a {
  color: #0d2d84;
  font-weight: 900;
  text-decoration: none;
}

.login-note a:hover {
  text-decoration: underline;
}

/* RIGHT HERO PANEL (Light Mode: Icy-Sky & Royal Cobalt Blue) */
.visual-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 30px 20px 52px;
  border-left: 1px solid #d8e8f8;
  background:
    radial-gradient(circle at 18% 24%, rgba(125, 211, 252, 0.42), transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(147, 197, 253, 0.38), transparent 36%),
    radial-gradient(circle at 72% 75%, rgba(56, 189, 248, 0.25), transparent 34%),
    linear-gradient(135deg, #f0f7ff 0%, #dcf0ff 52%, #e8f5ff 100%);
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(219, 238, 254, 0.3)),
    radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.12), transparent 30%);
  pointer-events: none;
}

.visual-panel::before,
.visual-panel::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(15, 37, 87, 0.08);
  pointer-events: none;
}

.visual-panel::before {
  width: 380px;
  height: 380px;
  right: -160px;
  top: 32px;
}

.visual-panel::after {
  width: 240px;
  height: 240px;
  right: 100px;
  bottom: -110px;
}

.floating-card {
  position: relative;
  z-index: 2;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid #c7dbf4;
  box-shadow: 0 12px 26px rgba(15, 37, 87, 0.1);
  color: #0b132b;
}

.top-card strong {
  display: block;
  font-size: 13px;
  font-weight: 900;
  color: #0b132b;
}

.top-card small {
  display: block;
  margin-top: 1px;
  font-size: 10.5px;
  color: #475569;
}

.mini-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: #dceeff;
  color: #0d2d84;
}

.visual-content {
  position: relative;
  z-index: 2;
  max-width: 560px;
  padding-top: 4px;
}

.visual-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #dceeff;
  color: #0f2963;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
  border: 1px solid #bddaff;
}

.visual-content h2 {
  margin: 10px 0 8px;
  color: #0b132b;
  font-size: clamp(26px, 2.7vw, 38px);
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -1.4px;
}

.visual-content p {
  margin: 0;
  max-width: 520px;
  color: #334155;
  font-size: 13px;
  line-height: 1.55;
}

.visual-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.stat-card {
  padding: 12px 12px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #c7dbf4;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 22px rgba(15, 37, 87, 0.08);
}

.stat-card strong {
  display: block;
  color: #0d2d84;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 4px;
}

.stat-card:nth-child(2) strong {
  color: #6d28d9;
}

.stat-card:nth-child(3) strong {
  color: #0284c7;
}

.stat-card span {
  color: #334155;
  font-size: 11px;
  line-height: 1.45;
}

.property-showcase {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.property-card.featured {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 14px;
  align-items: stretch;
  padding: 13px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #c7dbf4;
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 28px rgba(15, 37, 87, 0.1);
}

.property-image.large {
  min-height: 118px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  background: #e2ebf5;
  border: 1px solid #c7dbf4;
}

.featured-property-photo {
  width: 100%;
  height: 100%;
  min-height: 118px;
  object-fit: cover;
  display: block;
}

.property-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.property-tag {
  display: inline-flex;
  width: fit-content;
  min-height: 24px;
  align-items: center;
  padding: 4px 10px;
  margin-bottom: 6px;
  border-radius: 999px;
  background: #dceeff;
  border: 1px solid #bddaff;
  color: #0f2963;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
}

.property-info h3 {
  margin: 0 0 4px;
  color: #0b132b;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.property-info p {
  margin: 0 0 8px;
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
}

.property-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.property-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e1effc;
  border: 1px solid #c5dbf5;
  color: #0f2557;
  font-size: 10.5px;
  font-weight: 800;
}

.bottom-mini-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mini-property {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #c7dbf4;
  backdrop-filter: blur(10px);
}

.mini-thumb {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid #c7dbf4;
}

.mini-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* DARK MODE OVERRIDES */
:global(html[data-theme="dark"]) .signup-page {
  --background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.15), transparent 34%),
    radial-gradient(circle at bottom right, rgba(167, 139, 250, 0.14), transparent 34%),
    linear-gradient(180deg, #06090f 0%, #090c14 45%, #0b0f18 100%);
  color: #f3f4f6;
  color-scheme: dark;
}

:global(html[data-theme="dark"]) .signup-card {
  background: #12151f;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.68), 0 10px 25px rgba(0, 0, 0, 0.38);
}

:global(html[data-theme="dark"]) .form-panel {
  background: linear-gradient(180deg, #131620, #0f121a);
}

:global(html[data-theme="dark"]) .form-panel::after {
  box-shadow: 14px 0 25px rgba(0, 0, 0, 0.35);
}

:global(html[data-theme="dark"]) .brand-badge {
  color: #22d3ee;
  background: #171c28;
  border-color: rgba(34, 211, 238, 0.32);
  box-shadow: 0 10px 22px rgba(34, 211, 238, 0.14);
}

:global(html[data-theme="dark"]) .brand-copy h2 { color: #ffffff; }
:global(html[data-theme="dark"]) .brand-copy h2::after { color: #22d3ee; }
:global(html[data-theme="dark"]) .brand-copy p { color: #7e869a; }
:global(html[data-theme="dark"]) .eyebrow { background: rgba(34, 211, 238, 0.14); border-color: rgba(34, 211, 238, 0.3); color: #22d3ee; }
:global(html[data-theme="dark"]) .form-copy h1 { color: #ffffff; }
:global(html[data-theme="dark"]) .intro { color: #9199ad; }
:global(html[data-theme="dark"]) .field-group label { color: #cbd5e1; }
:global(html[data-theme="dark"]) .mini-hint { color: #7e869a; }
:global(html[data-theme="dark"]) .input-shell { border-color: rgba(255, 255, 255, 0.1); background: #181c28; }
:global(html[data-theme="dark"]) .input-shell:focus-within { border-color: #22d3ee; background: #181c28; box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.15); }
:global(html[data-theme="dark"]) .input-icon { color: #828b9f; }
:global(html[data-theme="dark"]) .input-shell input { color: #f3f4f6; }
:global(html[data-theme="dark"]) .input-shell input::placeholder { color: #6e768a; }
:global(html[data-theme="dark"]) .input-action { color: #22d3ee; }
:global(html[data-theme="dark"]) .strength-bars span { background: #222634; }
:global(html[data-theme="dark"]) .role-card { border-color: rgba(255, 255, 255, 0.08); background: #181c28; }
:global(html[data-theme="dark"]) .role-card:hover:not(:disabled) { border-color: rgba(34, 211, 238, 0.38); }
:global(html[data-theme="dark"]) .role-card.selected { border-color: #22d3ee; background: rgba(34, 211, 238, 0.1); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.14); }
:global(html[data-theme="dark"]) .role-icon { color: #9199ad; background: #222634; }
:global(html[data-theme="dark"]) .role-icon.tenant { background: #22d3ee; color: #041217; }
:global(html[data-theme="dark"]) .role-icon.owner { background: #a78bfa; color: #0b0c10; }
:global(html[data-theme="dark"]) .role-text strong { color: #ffffff; }
:global(html[data-theme="dark"]) .role-text small { color: #8e96aa; }
:global(html[data-theme="dark"]) .role-check { border-color: rgba(255, 255, 255, 0.22); background: #14161e; }
:global(html[data-theme="dark"]) .role-card.selected .role-check { border-color: #22d3ee; }
:global(html[data-theme="dark"]) .terms-mark { border-color: rgba(255, 255, 255, 0.24); background: #181c28; }
:global(html[data-theme="dark"]) .terms-box input:checked + .terms-mark { background: linear-gradient(135deg, #22d3ee, #06b6d4); }
:global(html[data-theme="dark"]) .terms-box input:checked + .terms-mark::after { border-right-color: #041217; border-bottom-color: #041217; }
:global(html[data-theme="dark"]) .terms-copy { color: #8e96aa; }
:global(html[data-theme="dark"]) .terms-copy a { color: #22d3ee; }
:global(html[data-theme="dark"]) .message-box.error { border-color: rgba(248, 113, 113, 0.34); background: rgba(248, 113, 113, 0.12); color: #fca5a5; }
:global(html[data-theme="dark"]) .message-box strong { color: #ffffff; }
:global(html[data-theme="dark"]) .submit-button { background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%); color: #041217; box-shadow: 0 14px 26px rgba(34, 211, 238, 0.3); }
:global(html[data-theme="dark"]) .spinner { border-color: rgba(4, 18, 23, 0.35); border-top-color: #041217; }
:global(html[data-theme="dark"]) .login-note { color: #8e96aa; }
:global(html[data-theme="dark"]) .login-note a { color: #22d3ee; }
:global(html[data-theme="dark"]) .visual-panel {
  border-left-color: rgba(255, 255, 255, 0.06);
  background:
    radial-gradient(circle at 18% 24%, rgba(34, 211, 238, 0.24), transparent 30%),
    radial-gradient(circle at 82% 18%, rgba(167, 139, 250, 0.22), transparent 32%),
    radial-gradient(circle at 72% 75%, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, #07090e 0%, #0c101a 52%, #0f1624 100%);
}
:global(html[data-theme="dark"]) .visual-overlay {
  background:
    linear-gradient(180deg, rgba(8, 10, 16, 0.25), rgba(8, 10, 16, 0.05)),
    radial-gradient(circle at bottom left, rgba(34, 211, 238, 0.07), transparent 30%);
}
:global(html[data-theme="dark"]) .visual-panel::before,
:global(html[data-theme="dark"]) .visual-panel::after { border-color: rgba(255, 255, 255, 0.07); }
:global(html[data-theme="dark"]) .floating-card { background: rgba(24, 28, 40, 0.85); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 16px 28px rgba(0, 0, 0, 0.45); color: #ffffff; }
:global(html[data-theme="dark"]) .top-card strong { color: #ffffff; }
:global(html[data-theme="dark"]) .top-card small { color: #9ca3b8; }
:global(html[data-theme="dark"]) .mini-icon { background: rgba(34, 211, 238, 0.16); color: #22d3ee; }
:global(html[data-theme="dark"]) .visual-badge { background: rgba(34, 211, 238, 0.14); border-color: rgba(34, 211, 238, 0.32); color: #22d3ee; }
:global(html[data-theme="dark"]) .visual-content h2 { color: #ffffff; }
:global(html[data-theme="dark"]) .visual-content p { color: #9ca3b8; }
:global(html[data-theme="dark"]) .stat-card { background: rgba(24, 28, 40, 0.8); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35); }
:global(html[data-theme="dark"]) .stat-card strong { color: #22d3ee; }
:global(html[data-theme="dark"]) .stat-card:nth-child(2) strong { color: #a78bfa; }
:global(html[data-theme="dark"]) .stat-card:nth-child(3) strong { color: #38bdf8; }
:global(html[data-theme="dark"]) .stat-card span { color: #cbd5e1; }
:global(html[data-theme="dark"]) .property-card.featured { background: rgba(24, 28, 40, 0.85); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 18px 32px rgba(0, 0, 0, 0.45); }
:global(html[data-theme="dark"]) .property-image.large { background: #121520; border-color: rgba(255, 255, 255, 0.14); }
:global(html[data-theme="dark"]) .property-tag { background: rgba(34, 211, 238, 0.15); border-color: rgba(34, 211, 238, 0.32); color: #22d3ee; }
:global(html[data-theme="dark"]) .property-info h3 { color: #ffffff; }
:global(html[data-theme="dark"]) .property-info p { color: #9ca3b8; }
:global(html[data-theme="dark"]) .property-meta span { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); color: #e2e8f0; }
:global(html[data-theme="dark"]) .mini-property { background: rgba(24, 28, 40, 0.8); border-color: rgba(255, 255, 255, 0.08); }
:global(html[data-theme="dark"]) .mini-thumb { border-color: rgba(255, 255, 255, 0.16); }
:global(html[data-theme="dark"]) .mini-property strong { color: #ffffff; }
:global(html[data-theme="dark"]) .mini-property small { color: #9ca3b8; }
:global(html[data-theme="dark"]) .visual-footer { color: #7e869a; }

.mini-property strong {
  display: block;
  margin-bottom: 2px;
  color: #0b132b;
  font-size: 12px;
  font-weight: 900;
}

.mini-property small {
  color: #475569;
  font-size: 10.5px;
}

.visual-footer {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

/* FOCUS */
input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid rgba(34, 211, 238, 0.45);
  outline-offset: 3px;
}

/* ANIM */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* RESPONSIVE */
@media (max-width: 1180px) {
  .signup-card {
    grid-template-columns: minmax(360px, 0.94fr) minmax(420px, 1.06fr);
  }

  .form-panel-inner {
    padding: 24px 28px 22px 30px;
  }

  .visual-panel {
    padding: 22px 24px 18px 42px;
  }

  .property-card.featured {
    grid-template-columns: 130px 1fr;
  }
}

@media (max-width: 980px) {
  .signup-wrapper {
    padding: 18px;
  }

  .signup-card {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .form-panel::after {
    display: none;
  }

  .visual-panel {
    min-height: auto;
    padding: 24px 22px 22px;
    order: -1;
    border-left: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .form-panel-inner {
    max-width: none;
    padding: 26px 22px 26px;
  }

  .visual-content h2 {
    font-size: 32px;
  }

  .property-card.featured {
    grid-template-columns: 1fr;
  }

  .property-image.large {
    min-height: 130px;
  }
}

@media (max-width: 680px) {
  .signup-wrapper {
    padding: 12px;
  }

  .signup-card {
    border-radius: 22px;
  }

  .visual-panel {
    min-height: auto;
    padding: 20px 16px 18px;
  }

  .floating-card {
    align-self: stretch;
  }

  .visual-content h2 {
    font-size: 26px;
    line-height: 1.15;
  }

  .visual-content p {
    font-size: 13px;
  }

  .bottom-mini-cards,
  .role-grid,
  .visual-stats {
    grid-template-columns: 1fr;
  }

  .form-panel-inner {
    padding: 22px 16px 22px;
  }

  .brand-row {
    margin-bottom: 16px;
  }

  .form-copy h1 {
    font-size: 30px;
  }
}

@media (max-width: 420px) {
  .signup-wrapper {
    padding: 8px;
  }

  .signup-card {
    border-radius: 18px;
  }

  .form-panel-inner,
  .visual-panel {
    padding-left: 14px;
    padding-right: 14px;
  }
}

@media (min-width: 681px) and (max-height: 1080px) {
  .signup-wrapper {
    height: 100%;
    min-height: 0;
    padding: 10px 14px;
    align-items: stretch;
  }

  .signup-card {
    min-height: 0;
    height: calc(100dvh - 20px);
    max-height: calc(100dvh - 20px);
    grid-template-rows: minmax(0, 1fr);
  }

  .form-panel,
  .visual-panel {
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
  }

  .form-panel-inner {
    padding: 14px 28px 12px 24px;
    justify-content: space-between;
  }

  .brand-row { margin-bottom: 6px; gap: 10px; }
  .brand-badge { width: 34px; height: 34px; border-radius: 10px; font-size: 17px; }
  .brand-copy h2 { font-size: 17px; }
  .brand-copy p { font-size: 8.5px; letter-spacing: 1.2px; }
  .form-copy { margin-bottom: 6px; }
  .eyebrow { min-height: 0; margin-bottom: 4px; padding: 3px 9px; font-size: 9px; }
  .form-copy h1 { font-size: 26px; margin-bottom: 3px; }
  .intro { font-size: 11.5px; line-height: 1.35; }
  .field-group { margin-bottom: 6px; }
  .field-group label { margin-bottom: 2px; font-size: 11px; }
  .input-shell { min-height: 36px; border-radius: 11px; }
  .input-shell input { min-height: 34px; font-size: 12.5px; padding: 6px 8px 6px 0; }
  .password-strength { margin-top: 4px; }
  .password-strength p { margin-top: 3px; font-size: 10px; }
  .role-grid { gap: 8px; }
  .role-card { min-height: 50px; padding: 6px 10px; border-radius: 12px; }
  .role-icon { width: 28px; height: 28px; border-radius: 8px; }
  .role-text strong { font-size: 11.5px; }
  .role-text small { font-size: 9.5px; line-height: 1.2; }
  .terms-box { margin-bottom: 6px; }
  .terms-copy { font-size: 11px; line-height: 1.3; }
  .submit-button { min-height: 38px; border-radius: 999px; font-size: 13px; padding: 8px 16px; }
  .login-note { margin-top: 6px; font-size: 11.5px; }
  .signup-card :deep(.google-continue) { margin-top: 6px; }

  .visual-panel {
    padding: 14px 22px 12px 42px;
    justify-content: space-between;
  }
  .floating-card { padding: 8px 12px; border-radius: 14px; gap: 9px; }
  .mini-icon { width: 32px; height: 32px; border-radius: 9px; }
  .top-card strong { font-size: 12px; }
  .top-card small { font-size: 10px; }
  .visual-content { padding-top: 0; }
  .visual-badge { min-height: 22px; padding: 3px 10px; font-size: 9px; }
  .visual-content h2 { font-size: clamp(22px, 2.3vw, 30px); margin: 6px 0 5px; line-height: 1.08; }
  .visual-content p { font-size: 11.5px; line-height: 1.4; }
  .visual-stats { gap: 8px; margin-top: 10px; }
  .stat-card { padding: 9px 10px; border-radius: 12px; }
  .stat-card strong { font-size: 11px; margin-bottom: 3px; }
  .stat-card span { font-size: 10px; line-height: 1.35; }
  .property-showcase { gap: 8px; margin-top: 10px; }
  .property-card.featured { grid-template-columns: 115px 1fr; gap: 12px; padding: 10px; border-radius: 16px; }
  .property-image.large { min-height: 92px; max-height: 98px; border-radius: 12px; }
  .featured-property-photo { min-height: 92px; max-height: 98px; }
  .property-tag { min-height: 20px; padding: 2px 8px; margin-bottom: 4px; font-size: 9px; }
  .property-info h3 { font-size: 15px; margin-bottom: 2px; }
  .property-info p { font-size: 11px; margin-bottom: 6px; line-height: 1.35; }
  .property-meta { gap: 6px; }
  .property-meta span { min-height: 20px; padding: 2px 8px; font-size: 9.5px; }
  .bottom-mini-cards { gap: 8px; }
  .mini-property { padding: 8px 10px; border-radius: 12px; gap: 8px; }
  .mini-thumb { width: 30px; height: 30px; border-radius: 8px; }
  .mini-property strong { font-size: 11px; margin-bottom: 1px; }
  .mini-property small { font-size: 9.5px; }
  .visual-footer { margin-top: 6px; font-size: 9.5px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>