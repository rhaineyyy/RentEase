<template>
  <IonPage>
    <IonContent class="login-page" :fullscreen="true">
      <div class="login-stage">
        <div class="login-shell">
          <main class="form-side">
            <div class="form-inner">
              <div class="brand-row">
                <div class="brand-symbol" aria-hidden="true">⌂</div>
                <div class="brand-title"><strong>RentEase<span>.</span></strong><small>RENT SMARTER · LIVE BETTER</small></div>
                <ThemeToggle class="brand-theme-toggle" />
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
import ThemeToggle from '@/components/ThemeToggle.vue';

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
.login-page{--background:#dfeeff;--ion-text-color:#0b132b;color:#0b132b;color-scheme:light;font-family:'Plus Jakarta Sans',Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}.login-stage{min-height:100%;display:flex;align-items:center;justify-content:center;padding:clamp(12px,2.2vw,28px);background:radial-gradient(circle at 10% 14%,rgba(186,230,253,.8),transparent 40%),radial-gradient(circle at 90% 86%,rgba(147,197,253,.6),transparent 40%),linear-gradient(140deg,#dcebfa 0%,#ebf4fd 50%,#d6e9fa 100%)}
.login-shell{display:grid;grid-template-columns:minmax(350px,.89fr) minmax(400px,1.11fr);width:100%;max-width:1270px;min-height:700px;overflow:hidden;border-radius:30px;background:#ffffff;border:1px solid #d2e3f6;box-shadow:0 28px 72px rgba(15,37,87,.12),0 5px 25px rgba(15,37,87,.05)}
.form-side{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;background:#ffffff}.form-inner{width:100%;max-width:490px;padding:40px clamp(24px,4vw,54px)}
.brand-row{display:flex;align-items:center;gap:12px;margin-bottom:42px}.brand-title{flex:1;min-width:0}.brand-theme-toggle{margin-left:auto}.brand-symbol{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;color:#60a5fa;font-size:30px;font-weight:900;background:linear-gradient(145deg,#091945 0%,#102a71 100%);border:1px solid #1e3a8a;box-shadow:0 9px 22px rgba(16,42,113,.24)}.brand-row strong,.brand-row small{display:block}.brand-row strong{font-size:24px;letter-spacing:-.8px;color:#0b132b}.brand-row strong span{color:#0d2d84}.brand-row small{margin-top:2px;font-size:8px;letter-spacing:1.5px;font-weight:850;color:#64748b}
.eyebrow{display:inline-block;padding:7px 12px;border-radius:999px;background:#dceeff;border:1px solid #bddaff;color:#0f2963;font-weight:850;letter-spacing:1.2px;font-size:10px}.intro h1{margin:16px 0 10px;font-size:clamp(32px,3.6vw,45px);letter-spacing:-1.6px;line-height:1.13;color:#0b132b;font-weight:900}.intro h1 em{font-style:normal;background:linear-gradient(115deg,#0a2472,#0d3b9e);background-clip:text;-webkit-background-clip:text;color:transparent}.intro p{font-size:13px;color:#475569;line-height:1.8;margin:0 0 26px;max-width:385px}
.field{margin:0 0 18px}.field label{display:block;font-size:12px;font-weight:800;margin:0 0 9px;color:#1e293b}.input-wrap{display:flex;align-items:center;min-height:54px;background:#e6f0fa;border:1px solid #cfe0f5;border-radius:15px;transition:.18s}.input-wrap:focus-within{border-color:#0d47ff;background:#f2f7fd;box-shadow:0 0 0 4px rgba(13,71,255,.14)}.field-icon{display:grid;place-items:center;width:48px;flex:none;color:#64748b}.field-icon svg,.secure-note svg{width:19px;height:19px;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.input-wrap input{width:100%;min-width:0;height:52px;padding:12px 6px 12px 0;outline:none;border:0;background:transparent;color:#0b132b;font-size:13px;font-family:inherit}.input-wrap input::placeholder{color:#64748b}.show-password{background:none;border:0;color:#0d2d84;font-size:12px;font-weight:800;padding:12px;margin-right:4px;cursor:pointer}.sign-in{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:54px;margin-top:9px;padding:13px 18px;border:none;border-radius:999px;background:linear-gradient(90deg,#0033ff 0%,#0a45ff 55%,#1a5cff 100%);box-shadow:0 12px 26px rgba(10,69,255,.3);color:#ffffff;font-size:14px;font-weight:850;cursor:pointer;transition:transform .18s,box-shadow .18s}.sign-in:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(10,69,255,.4)}.sign-in:disabled{opacity:.68;cursor:wait}.arrow{margin-left:auto;font-size:20px}.spinner{width:17px;height:17px;border:2px solid rgba(255,255,255,.35);border-top-color:#ffffff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.alert{display:flex;gap:10px;align-items:flex-start;border-radius:13px;padding:13px 12px;margin:0 0 20px;font-size:12px}.alert.success{background:#eaf4ff;border:1px solid #bddaff;color:#0f2963}.alert.error{background:#fff1f2;border:1px solid #fecdd3;color:#be123c}.alert-icon{display:grid;place-items:center;flex:none;width:23px;height:23px;border-radius:8px;background:rgba(13,71,255,.14);color:#0d47ff;font-weight:900}.alert.error .alert-icon{background:rgba(244,63,94,.16);color:#e11d48}.alert div{flex:1;min-width:0}.alert strong{display:block;margin-bottom:4px;color:#0b132b}.alert p{margin:0;line-height:1.55;overflow-wrap:anywhere}.dismiss{background:none;border:0;color:inherit;font-size:23px;cursor:pointer;line-height:1}
.secure-note{display:flex;gap:7px;justify-content:center;align-items:center;margin:15px 0 24px;font-size:10px;color:#64748b}.secure-note svg{width:15px;height:15px;color:#0d2d84}.register-link{text-align:center;padding:18px 0 0;border-top:1px solid #e2ebf5;font-size:12px;color:#64748b}.register-link a{color:#0d2d84;font-weight:850;text-decoration:none;margin-left:5px}.register-link a:hover{text-decoration:underline}.form-footer{text-align:center;font-size:10px;color:#64748b;margin-top:24px}
.visual-side{position:relative;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;min-width:0;padding:36px clamp(27px,3vw,48px) 27px;color:#0b132b;border-left:1px solid #d8e8f8;background:radial-gradient(circle at 54% 42%,rgba(0,184,255,.22),transparent 45%),radial-gradient(circle at 78% 18%,rgba(125,211,252,.42),transparent 38%),linear-gradient(135deg,#f2f9ff 0%,#dcf0ff 52%,#e8f6ff 100%)}.visual-side::after{position:absolute;inset:0;content:'';pointer-events:none;background:linear-gradient(180deg,transparent 58%,rgba(219,238,254,.35))}.visual-top,.visual-copy,.visual-footer{position:relative;z-index:2}.visual-top{display:flex;align-items:center;justify-content:space-between;gap:15px}.visual-logo{font-size:12px;letter-spacing:2px;font-weight:900;color:#0b132b}.visual-pill{font-size:9px;letter-spacing:1.1px;padding:8px 11px;border:1px solid #bddaff;background:#dceeff;color:#163278;border-radius:30px;font-weight:800}.visual-illustration{position:relative;align-self:center;width:min(100%,530px);height:275px;margin:5px 0 -14px}.illustration-orb{position:absolute;width:250px;height:250px;left:50%;top:0;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 50% 42%,#5ce6ff 0%,#00b8ff 62%,#0095e8 100%);box-shadow:0 18px 55px rgba(0,180,255,.36)}.house{position:absolute;filter:drop-shadow(0 16px 24px rgba(10,29,86,.22))}.house .roof{width:0;height:0;border-left:106px solid transparent;border-right:106px solid transparent;border-bottom:74px solid #041342}.house .wall{display:flex;align-items:center;justify-content:space-evenly;width:212px;height:135px;padding:20px 9px;background:linear-gradient(180deg,#00249c 0%,#061a6e 100%);border:1px solid rgba(96,165,250,.38);border-radius:0 0 10px 10px}.house .window{width:36px;height:44px;border:4px solid #102a82;background:linear-gradient(135deg,#dbeafe,#93c5fd);box-shadow:0 0 12px rgba(147,197,253,.5);border-radius:5px}.house .door{width:50px;height:75px;background:linear-gradient(180deg,#c4b5fd 0%,#a78bfa 100%);border:4px solid #102a82;border-radius:8px 8px 0 0;align-self:flex-end}.house-back{transform:scale(.62);transform-origin:bottom left;left:2%;bottom:5px;opacity:.92}.house-front{left:50%;bottom:1px;transform:translateX(-50%)}.landscape{position:absolute;left:6%;right:6%;bottom:0;height:33px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(14,165,233,.46) 0%,rgba(56,189,248,.16) 65%,transparent 85%);filter:blur(2px)}
.visual-copy{max-width:530px}.visual-kicker{font-size:10px;font-weight:850;letter-spacing:1.7px;color:#16398f}.visual-copy h2{font-size:clamp(31px,3.3vw,47px);line-height:1.09;letter-spacing:-1.6px;margin:13px 0 13px;color:#0b132b;font-weight:900}.visual-copy h2 span{color:#0d2d84}.visual-copy p{font-size:13px;line-height:1.8;color:#334155;margin:0;max-width:440px}.feature-chips{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.feature-chips span{padding:9px 11px;background:#e1effc;border:1px solid #c5dbf5;color:#0f2557;border-radius:11px;font-size:11px;font-weight:750;backdrop-filter:blur(8px)}.visual-footer{display:flex;justify-content:space-between;gap:12px;font-size:9px;letter-spacing:1.2px;color:#475569;font-weight:750;margin-top:30px}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #0d47ff;outline-offset:3px}

/* DARK MODE OVERRIDES — Matches Reference Dark Mode Screenshot */
:global(html[data-theme="dark"]) .login-page{--background:#050b12;--ion-text-color:#f3f4f6;color:#f3f4f6;color-scheme:dark}
:global(html[data-theme="dark"]) .login-stage{background:radial-gradient(circle at 12% 18%,rgba(6,182,212,.26),transparent 42%),radial-gradient(circle at 88% 82%,rgba(14,165,233,.16),transparent 42%),linear-gradient(135deg,#041d2e 0%,#071928 38%,#070b12 100%)}
:global(html[data-theme="dark"]) .login-shell{background:#0f131c;border-color:rgba(56,189,248,.14);box-shadow:0 30px 80px rgba(0,0,0,.72),0 5px 25px rgba(0,0,0,.42)}
:global(html[data-theme="dark"]) .form-side{background:linear-gradient(180deg,#111621 0%,#0c1018 100%)}
:global(html[data-theme="dark"]) .brand-symbol{color:#22d3ee;background:#101929;border-color:rgba(34,211,238,.36);box-shadow:0 9px 22px rgba(34,211,238,.16)}
:global(html[data-theme="dark"]) .brand-row strong{color:#ffffff}
:global(html[data-theme="dark"]) .brand-row strong span{color:#22d3ee}
:global(html[data-theme="dark"]) .brand-row small{color:#7e869a}
:global(html[data-theme="dark"]) .eyebrow{background:rgba(14,116,144,.32);border-color:rgba(56,189,248,.34);color:#38bdf8}
:global(html[data-theme="dark"]) .intro h1{color:#ffffff}
:global(html[data-theme="dark"]) .intro h1 em{background:linear-gradient(115deg,#38bdf8,#22d3ee);background-clip:text;-webkit-background-clip:text;color:transparent}
:global(html[data-theme="dark"]) .intro p{color:#9199ad}
:global(html[data-theme="dark"]) .field label{color:#e2e8f0}
:global(html[data-theme="dark"]) .input-wrap{background:#141923;border-color:rgba(148,163,184,.16)}
:global(html[data-theme="dark"]) .input-wrap:focus-within{border-color:#22d3ee;background:#161c28;box-shadow:0 0 0 4px rgba(34,211,238,.18)}
:global(html[data-theme="dark"]) .field-icon{color:#7e869a}
:global(html[data-theme="dark"]) .input-wrap input{color:#f8fafc}
:global(html[data-theme="dark"]) .input-wrap input::placeholder{color:#6e768a}
:global(html[data-theme="dark"]) .show-password{color:#22d3ee}
:global(html[data-theme="dark"]) .sign-in{background:linear-gradient(90deg,#00c6ff 0%,#00e1ff 55%,#22d3ee 100%);box-shadow:0 12px 28px rgba(0,212,255,.38);color:#031520}
:global(html[data-theme="dark"]) .spinner{border-color:rgba(3,21,32,.35);border-top-color:#031520}
:global(html[data-theme="dark"]) .alert.success{background:rgba(34,211,238,.12);border-color:rgba(34,211,238,.32);color:#67e8f9}
:global(html[data-theme="dark"]) .alert.error{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.32);color:#fca5a5}
:global(html[data-theme="dark"]) .alert strong{color:#ffffff}
:global(html[data-theme="dark"]) .secure-note{color:#7e869a}
:global(html[data-theme="dark"]) .secure-note svg{color:#22d3ee}
:global(html[data-theme="dark"]) .register-link{border-top-color:rgba(255,255,255,.08);color:#8e96aa}
:global(html[data-theme="dark"]) .register-link a{color:#22d3ee}
:global(html[data-theme="dark"]) .form-footer{color:#6e768a}
:global(html[data-theme="dark"]) .visual-side{color:#ffffff;border-left-color:rgba(255,255,255,.06);background:radial-gradient(circle at 54% 44%,rgba(0,195,255,.22),transparent 45%),radial-gradient(circle at 80% 15%,rgba(34,211,238,.18),transparent 34%),linear-gradient(180deg,#080c14 0%,#05070b 100%)}
:global(html[data-theme="dark"]) .visual-side::after{background:linear-gradient(180deg,transparent 54%,rgba(4,6,10,.48))}
:global(html[data-theme="dark"]) .visual-logo{color:#ffffff}
:global(html[data-theme="dark"]) .visual-pill{border-color:rgba(56,189,248,.34);background:rgba(14,116,144,.32);color:#38bdf8}
:global(html[data-theme="dark"]) .illustration-orb{background:radial-gradient(circle at 50% 42%,#38e8ff 0%,#00bfff 58%,#0088cc 100%);box-shadow:0 0 75px rgba(0,195,255,.45)}
:global(html[data-theme="dark"]) .house{filter:drop-shadow(0 16px 24px rgba(0,0,0,.62))}
:global(html[data-theme="dark"]) .house .roof{border-bottom-color:#1c2230}
:global(html[data-theme="dark"]) .house .wall{background:linear-gradient(180deg,#181d2a 0%,#121622 100%);border-color:rgba(255,255,255,.1)}
:global(html[data-theme="dark"]) .house .window{border-color:#232a3b;background:linear-gradient(180deg,#38e8ff 0%,#00b4ff 100%);box-shadow:0 0 16px rgba(0,200,255,.65)}
:global(html[data-theme="dark"]) .house .door{background:linear-gradient(180deg,#a855f7 0%,#7e22ce 100%);border-color:#232a3b;box-shadow:0 0 18px rgba(168,85,247,.5)}
:global(html[data-theme="dark"]) .house-back{opacity:.78}
:global(html[data-theme="dark"]) .landscape{background:radial-gradient(ellipse at center,rgba(0,195,255,.55) 0%,rgba(0,160,230,.22) 60%,transparent 85%)}
:global(html[data-theme="dark"]) .visual-kicker{color:#38bdf8}
:global(html[data-theme="dark"]) .visual-copy h2{color:#ffffff}
:global(html[data-theme="dark"]) .visual-copy h2 span{color:#22d3ee}
:global(html[data-theme="dark"]) .visual-copy p{color:#94a3b8}
:global(html[data-theme="dark"]) .feature-chips span{background:#111722;border-color:rgba(148,163,184,.18);color:#e2e8f0}
:global(html[data-theme="dark"]) .visual-footer{color:#64748b}

@media(max-width:960px){.login-shell{grid-template-columns:minmax(315px,.9fr) minmax(320px,1.1fr)}.visual-side{padding:29px 23px}.visual-copy h2{font-size:34px}.visual-illustration{height:240px;transform:scale(.85)}.form-inner{padding:34px 27px}.brand-row{margin-bottom:32px}}
@media(max-width:700px){.login-stage{padding:0;display:block}.login-shell{display:flex;flex-direction:column-reverse;min-height:100dvh;border-radius:0;box-shadow:none;border:0}.visual-side{min-height:175px;padding:22px 20px 18px;border-left:0;border-bottom:1px solid rgba(255,255,255,.08)}.visual-top{margin-bottom:14px}.visual-illustration{display:none}.visual-copy h2{font-size:24px;max-width:390px;line-height:1.17;margin:7px 0}.visual-copy p,.feature-chips,.visual-footer{display:none}.visual-pill{display:none}.visual-kicker{font-size:9px}.form-inner{max-width:500px;padding:24px 20px calc(32px + env(safe-area-inset-bottom,0px))}.form-side{flex:1}.brand-row{margin-bottom:20px;gap:8px}.intro h1{font-size:30px}.intro p{margin-bottom:20px}.field{margin-bottom:15px}.form-footer{margin-top:20px}}
@media(max-width:380px){.form-inner{padding-left:16px;padding-right:16px}.visual-side{padding:18px 16px}.brand-row strong{font-size:20px}.login-shell{min-height:100%}.form-inner{padding-bottom:28px}}
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
