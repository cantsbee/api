const clientId = "6e4ca8910c3c479ea21b9de20ca7646c"; // reemplázalo por tu Client ID real
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  (async () => {
    try {
      const accessToken = await getAccessToken(clientId, code);
      const profile = await fetchProfile(accessToken);
      populateUI(profile);
    } catch (error) {
      console.error("Ocurrió un error durante la autenticación:", error);
    }
  })();
}

// Paso 1: Redirige a Spotify para loguearse
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://127.0.0.1:5173/callback"); // Asegúrate que esté en tu dashboard
  params.append("scope", "user-read-private user-read-email user-top-read");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Paso 2: Genera un código de verificación
function generateCodeVerifier(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Paso 3: Codifica el verificador como challenge SHA-256 base64-url
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Paso 4: Intercambia el "code" por un access_token
export async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://127.0.0.1:5173/callback");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  if (!result.ok) {
    const errorText = await result.text();
    throw new Error("Error al obtener token: " + errorText);
  }

  const { access_token } = await result.json();
  return access_token;
}

// Paso 5: Usar el token para obtener info de perfil
async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    const errorText = await result.text();
    throw new Error("Error al obtener perfil: " + errorText);
  }

  return await result.json();
}

// Paso 6: Mostrar los datos en HTML (ejemplo con IDs del DOM)
function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images?.[0]?.url) {
    const img = new Image(200, 200);
    img.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(img);
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document.getElementById("uri").href = profile.external_urls.spotify;
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").href = profile.href;
}
