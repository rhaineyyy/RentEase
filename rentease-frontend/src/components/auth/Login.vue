<template>
  <IonPage>
    <IonContent class="login-page" :fullscreen="true">
      <div class="login-stage">
        <div class="login-shell">
          <main class="form-side">
            <div class="form-inner">
              <div class="brand-row">
                <div class="brand-symbol" aria-hidden="true">⌂</div>
                <div><strong>RentEase<span>.</span></strong><small>RENT SMARTER · LIVE BETTER</small></div>
              </div>
              <div class="intro"><span class="eyebrow">WELCOME HOME</span><h1>Sign in to <em>RentEase.</em></h1><p>Pick up right where you left off. Your rental journey, all in one place.</p></div>
              <div v-if="showRegistrationMessage" class="alert success" role="status"><span class="alert-icon" aria-hidden="true">✓</span><div><strong>{{ registrationTitle }}</strong><p>{{ registrationDetail }}</p></div><button type="button" class="dismiss" aria-label="Dismiss registration message" @click="registrationMessageDismissed = true">×</button></div>
              <div v-if="route.query.serverUnavailable === '1'" class="alert error" role="alert"><span class="alert-icon" aria-hidden="true">!</span><div><strong>Connection issue</strong><p>Your session could not be verified. Check your backend connection, then try again.</p></div></div>
              <form @submit.prevent="handleLogin" :aria-busy="isLoading">
                <div class="field"><label for="login-email">Email address</label><div class="input-wrap"><span class="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span><input id="login-email" v-model="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" maxlength="254" :disabled="isLoading" required /></div></div>
                <div class="field"><label for="login-password">Password</label><div class="input-wrap"><span class="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><input id="login-password" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" :disabled="isLoading" required /><button class="show-password" type="button" :disabled="isLoading" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button></div></div>
                <div v-if="errorMessage" class="alert error" role="alert"><span class="alert-icon" aria-hidden="true">!</span><div><strong>Unable to sign in</strong><p>{{ errorMessage }}</p></div></div>
                <button type="submit" class="sign-in" :disabled="isLoading"><span v-if="isLoading" class="spinner" aria-hidden="true"></span><span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span><span v-if="!isLoading" class="arrow" aria-hidden="true">→</span></button>
              </form>
              <GoogleContinue :key="googleKey" intent="login" @error="message => errorMessage = message" @success="openDashboard" />
              <div class="secure-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg><span>Protected account access</span></div>
              <div class="register-link">New to RentEase? <RouterLink to="/signup">Create an account <span aria-hidden="true">↗</span></RouterLink></div>
              <div class="form-footer">© {{ new Date().getFullYear() }} RentEase · Your space, simplified.</div>
            </div>
          </main>
          <aside class="visual-side" aria-label="RentEase rental platform introduction">
            <div class="visual-top"><span class="visual-logo">RENTEASE LIVING</span><span class="visual-pill">A HOME FOR EVERY JOURNEY</span></div>
            <div class="visual-illustration" aria-hidden="true"><div class="illustration-orb"></div><div class="house house-back"><div class="roof"></div><div class="wall"><div class="window"></div><div class="window"></div></div></div><div class="house house-front"><div class="roof"></div><div class="wall"><div class="window"></div><div class="door"></div><div class="window"></div></div></div><div class="landscape"></div></div>
            <div class="visual-copy"><span class="visual-kicker">WELCOME TO YOUR SPACE</span><h2>Every great chapter <span>starts at home.</span></h2><p>Discover rentals, manage your lease, stay on top of payments, and take care of your space—all with RentEase.</p><div class="feature-chips"><span>⌂ Explore homes</span><span>◇ Manage rentals</span><span>✓ Stay connected</span></div></div>
            <div class="visual-footer"><span>FIND YOUR PLACE. FEEL AT HOME.</span><span>RENT EASE © {{ new Date().getFullYear() }}</span></div>
          </aside>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue';

import { login, dashboardPath, type AuthUser } from '@/services/auth';
import GoogleContinue from '@/components/auth/GoogleContinue.vue';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const registrationMessageDismissed = ref(false);
const googleKey = ref(0);

function resetLoginForm() {
  email.value = '';
  password.value = '';
  isLoading.value = false;
  errorMessage.value = '';
  showPassword.value = false;
  registrationMessageDismissed.value = false;
  googleKey.value += 1;
}

onIonViewWillEnter(resetLoginForm);

const registrationKind = computed(() => String(route.query.registered || ''));
const showRegistrationMessage = computed(() =>
  ['1', 'tenant', 'owner'].includes(registrationKind.value) &&
  !registrationMessageDismissed.value,
);
const registrationTitle = computed(() =>
  registrationKind.value === 'owner'
    ? 'Owner account submitted'
    : 'Account created successfully',
);
const registrationDetail = computed(() =>
  registrationKind.value === 'owner'
    ? 'An administrator must verify your account before you can sign in and publish properties.'
    : 'Your tenant account is ready. Sign in to browse rentals.',
);

async function openDashboard(user: AuthUser) {
  await router.replace(dashboardPath(user.role));
}

async function handleLogin() {
  if (isLoading.value) return;

  errorMessage.value = '';

  const normalizedEmail = email.value.trim().toLowerCase();

  if (!normalizedEmail || !password.value) {
    errorMessage.value =
      'Enter your email address and password.';
    return;
  }

  isLoading.value = true;

  try {
    const user = await login(
      normalizedEmail,
      password.value,
    );

    password.value = '';

    const navigationFailure = await router.replace(
      dashboardPath(user.role),
    );

    if (
      navigationFailure ||
      router.currentRoute.value.path === '/login'
    ) {
      errorMessage.value =
        'Your account was verified, but the dashboard could not open. Please try again.';
    }
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Sign in failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-page{--background:#090b10;--ion-text-color:#f3f4f6;color:#f3f4f6;color-scheme:dark;font-family:Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}.login-stage{min-height:100%;display:flex;align-items:center;justify-content:center;padding:clamp(12px,2.2vw,28px);background:radial-gradient(circle at 8% 12%,rgba(34,211,238,.15),transparent 36%),radial-gradient(circle at 92% 88%,rgba(167,139,250,.12),transparent 36%),linear-gradient(140deg,#060a10,#090d16)}
.login-shell{display:grid;grid-template-columns:minmax(350px,.89fr) minmax(400px,1.11fr);width:100%;max-width:1270px;min-height:700px;overflow:hidden;border-radius:30px;background:#12151f;border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px rgba(0,0,0,.68),0 5px 25px rgba(0,0,0,.38)}
.form-side{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#131620,#0f121a)}.form-inner{width:100%;max-width:490px;padding:40px clamp(24px,4vw,54px)}
.brand-row{display:flex;align-items:center;gap:12px;margin-bottom:46px}.brand-symbol{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;color:#22d3ee;font-size:30px;font-weight:900;background:#171c28;border:1px solid rgba(34,211,238,.32);box-shadow:0 9px 22px rgba(34,211,238,.14)}.brand-row strong,.brand-row small{display:block}.brand-row strong{font-size:24px;letter-spacing:-.8px;color:#ffffff}.brand-row strong span{color:#22d3ee}.brand-row small{margin-top:2px;font-size:8px;letter-spacing:1.5px;font-weight:850;color:#7e869a}
.eyebrow{display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(34,211,238,.14);border:1px solid rgba(34,211,238,.3);color:#22d3ee;font-weight:850;letter-spacing:1.2px;font-size:10px}.intro h1{margin:16px 0 10px;font-size:clamp(32px,3.6vw,45px);letter-spacing:-1.6px;line-height:1.13;color:#ffffff;font-weight:900}.intro h1 em{font-style:normal;background:linear-gradient(115deg,#38bdf8,#22d3ee);background-clip:text;-webkit-background-clip:text;color:transparent}.intro p{font-size:13px;color:#9199ad;line-height:1.8;margin:0 0 26px;max-width:385px}
.field{margin:0 0 18px}.field label{display:block;font-size:12px;font-weight:800;margin:0 0 9px;color:#cbd5e1}.input-wrap{display:flex;align-items:center;min-height:54px;background:#181c28;border:1px solid rgba(255,255,255,.1);border-radius:15px;transition:.18s}.input-wrap:focus-within{border-color:#22d3ee;box-shadow:0 0 0 4px rgba(34,211,238,.16)}.field-icon{display:grid;place-items:center;width:48px;flex:none;color:#828b9f}.field-icon svg,.secure-note svg{width:19px;height:19px;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.input-wrap input{width:100%;min-width:0;height:52px;padding:12px 6px 12px 0;outline:none;border:0;background:transparent;color:#f3f4f6;font-size:13px;font-family:inherit}.input-wrap input::placeholder{color:#6e768a}.show-password{background:none;border:0;color:#22d3ee;font-size:12px;font-weight:800;padding:12px;margin-right:4px;cursor:pointer}.sign-in{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:54px;margin-top:9px;padding:13px 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#22d3ee 0%,#06b6d4 100%);box-shadow:0 12px 26px rgba(34,211,238,.32);color:#041217;font-size:14px;font-weight:850;cursor:pointer;transition:transform .18s,box-shadow .18s}.sign-in:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(34,211,238,.44)}.sign-in:disabled{opacity:.68;cursor:wait}.arrow{margin-left:auto;font-size:20px}.spinner{width:17px;height:17px;border:2px solid rgba(4,18,23,.35);border-top-color:#041217;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.alert{display:flex;gap:10px;align-items:flex-start;border-radius:13px;padding:13px 12px;margin:0 0 20px;font-size:12px}.alert.success{background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.32);color:#67e8f9}.alert.error{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.32);color:#fca5a5}.alert-icon{display:grid;place-items:center;flex:none;width:23px;height:23px;border-radius:8px;background:rgba(34,211,238,.22);color:#22d3ee;font-weight:900}.alert.error .alert-icon{background:rgba(248,113,113,.22);color:#f87171}.alert div{flex:1;min-width:0}.alert strong{display:block;margin-bottom:4px;color:#ffffff}.alert p{margin:0;line-height:1.55;overflow-wrap:anywhere}.dismiss{background:none;border:0;color:inherit;font-size:23px;cursor:pointer;line-height:1}
.secure-note{display:flex;gap:7px;justify-content:center;align-items:center;margin:15px 0 24px;font-size:10px;color:#7e869a}.secure-note svg{width:15px;height:15px;color:#22d3ee}.register-link{text-align:center;padding:18px 0 0;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#8e96aa}.register-link a{color:#22d3ee;font-weight:850;text-decoration:none;margin-left:5px}.register-link a:hover{text-decoration:underline}.form-footer{text-align:center;font-size:10px;color:#6e768a;margin-top:24px}
.visual-side{position:relative;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;min-width:0;padding:36px clamp(27px,3vw,48px) 27px;color:white;border-left:1px solid rgba(255,255,255,.06);background:radial-gradient(circle at 80% 15%,rgba(34,211,238,.22),transparent 32%),radial-gradient(circle at 22% 61%,rgba(167,139,250,.2),transparent 38%),linear-gradient(135deg,#07090e,#0c101a 54%,#0e1420)}.visual-side::after{position:absolute;inset:0;content:'';pointer-events:none;background:linear-gradient(180deg,transparent 54%,rgba(5,6,10,.6))}.visual-top,.visual-copy,.visual-footer{position:relative;z-index:2}.visual-top{display:flex;align-items:center;justify-content:space-between;gap:15px}.visual-logo{font-size:12px;letter-spacing:2px;font-weight:900;color:#ffffff}.visual-pill{font-size:9px;letter-spacing:1.1px;padding:8px 11px;border:1px solid rgba(34,211,238,.32);background:rgba(34,211,238,.12);color:#22d3ee;border-radius:30px;font-weight:800}.visual-illustration{position:relative;align-self:center;width:min(100%,530px);height:275px;margin:5px 0 -14px}.illustration-orb{position:absolute;width:250px;height:250px;left:50%;top:0;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(34,211,238,.52),rgba(14,165,233,.32) 54%,rgba(14,19,30,.92));box-shadow:0 12px 65px rgba(34,211,238,.24)}.house{position:absolute;filter:drop-shadow(0 16px 20px rgba(0,0,0,.55))}.house .roof{width:0;height:0;border-left:106px solid transparent;border-right:106px solid transparent;border-bottom:74px solid #232838}.house .wall{display:flex;align-items:center;justify-content:space-evenly;width:212px;height:135px;padding:20px 9px;background:linear-gradient(145deg,#191d2b,#121520);border:1px solid rgba(255,255,255,.1);border-radius:0 0 10px 10px}.house .window{width:36px;height:44px;border:4px solid #2a3042;background:linear-gradient(135deg,#38bdf8,#22d3ee);box-shadow:0 0 14px rgba(34,211,238,.48);border-radius:5px}.house .door{width:50px;height:75px;background:linear-gradient(135deg,#a78bfa,#7c3aed);border:4px solid #252a3a;border-radius:8px 8px 0 0;align-self:flex-end}.house-back{transform:scale(.62);transform-origin:bottom left;left:2%;bottom:5px;opacity:.72}.house-front{left:50%;bottom:1px;transform:translateX(-50%)}.landscape{position:absolute;left:6%;right:6%;bottom:0;height:33px;border-radius:50%;background:linear-gradient(180deg,rgba(34,211,238,.48),rgba(14,165,233,.16));filter:blur(2px)}
.visual-copy{max-width:530px}.visual-kicker{font-size:10px;font-weight:850;letter-spacing:1.7px;color:#22d3ee}.visual-copy h2{font-size:clamp(31px,3.3vw,47px);line-height:1.09;letter-spacing:-1.6px;margin:13px 0 13px;color:white;font-weight:900}.visual-copy h2 span{color:#22d3ee}.visual-copy p{font-size:13px;line-height:1.8;color:#9ca3b8;margin:0;max-width:440px}.feature-chips{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.feature-chips span{padding:9px 11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;border-radius:11px;font-size:11px;font-weight:750;backdrop-filter:blur(8px)}.visual-footer{display:flex;justify-content:space-between;gap:12px;font-size:9px;letter-spacing:1.2px;color:#7e869a;font-weight:750;margin-top:30px}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #22d3ee;outline-offset:3px}
@media(max-width:960px){.login-shell{grid-template-columns:minmax(315px,.9fr) minmax(320px,1.1fr)}.visual-side{padding:29px 23px}.visual-copy h2{font-size:34px}.visual-illustration{height:240px;transform:scale(.85)}.form-inner{padding:34px 27px}.brand-row{margin-bottom:38px}}
@media(max-width:700px){.login-stage{padding:0;display:block}.login-shell{display:flex;flex-direction:column-reverse;min-height:100dvh;border-radius:0;box-shadow:none;border:0}.visual-side{min-height:190px;padding:24px 22px 21px;border-left:0;border-bottom:1px solid rgba(255,255,255,.08)}.visual-top{margin-bottom:20px}.visual-illustration{display:none}.visual-copy h2{font-size:26px;max-width:390px;line-height:1.17;margin:9px 0}.visual-copy p,.feature-chips,.visual-footer{display:none}.visual-pill{display:none}.visual-kicker{font-size:9px}.form-inner{max-width:500px;padding:26px 22px calc(32px + env(safe-area-inset-bottom,0px))}.form-side{flex:1}.brand-row{margin-bottom:22px}.intro h1{font-size:31px}.intro p{margin-bottom:23px}.field{margin-bottom:15px}.form-footer{margin-top:24px}}
@media(max-width:380px){.form-inner{padding-left:17px;padding-right:17px}.visual-side{padding:19px 17px}.brand-row strong{font-size:20px}.login-shell{min-height:100%}.form-inner{padding-bottom:28px}}
@media (min-width: 701px) and (max-height: 1050px) {
  .login-stage { padding: 12px; }
  .login-shell { min-height: 0; height: calc(100dvh - 24px); }
  .form-side { min-height: 0; overflow: auto; }
  .form-inner { padding: 16px 32px; }
  .brand-row { margin-bottom: 16px; }
  .intro h1 { font-size: 34px; margin: 8px 0 6px; }
  .intro p { margin: 0 0 14px; line-height: 1.5; }
  .field { margin-bottom: 12px; }
  .input-wrap, .sign-in { min-height: 46px; }
  .input-wrap input { height: 44px; }
  .secure-note { margin: 8px 0 10px; }
  .register-link { padding-top: 10px; }
  .form-footer { margin-top: 10px; }
  .visual-side { padding: 16px 28px 12px; }
  .visual-illustration { height: 150px; margin: 0; }
  .visual-copy h2 { font-size: 30px; margin: 6px 0; }
  .visual-copy p { line-height: 1.45; }
  .feature-chips { margin-top: 10px; }
  .visual-footer { margin-top: 10px; }
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important}}
</style>
