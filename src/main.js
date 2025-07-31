const clientId = "6e4ca8910c3c479ea21b9de20ca7646c"; // reemplázalo por tu Client ID real
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// Variable global para almacenar el token
let globalAccessToken = null;

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  (async () => {
    try {
      globalAccessToken = await getAccessToken(clientId, code);
      const profile = await fetchProfile(globalAccessToken);
      populateUI(profile);
      
      // Cargar datos adicionales
      await loadAdditionalData(globalAccessToken);
    } catch (error) {
      console.error("Ocurrió un error durante la autenticación:", error);
    }
  })();
}

// Paso 1: Redirige a Spotify para loguearse
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  // Almacenar en variables globales en lugar de localStorage
  window.spotifyVerifier = verifier;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://127.0.0.1:5173/callback");
  params.append("scope", "user-read-private user-read-email user-top-read user-read-recently-played playlist-read-private user-library-read user-read-currently-playing user-read-playback-state");
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
  const verifier = window.spotifyVerifier;

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

// Función auxiliar para obtener el token (útil para otras funciones)
function getStoredToken() {
  return globalAccessToken;
}

// Función para verificar si el token es válido
async function isTokenValid(token) {
  if (!token) return false;
  
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

// NUEVAS FUNCIONES DE LA API DE SPOTIFY

// Obtener top tracks del usuario
async function fetchTopTracks(token, timeRange = 'medium_term', limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener top tracks");
  }

  return await result.json();
}

// Obtener top artistas del usuario
async function fetchTopArtists(token, timeRange = 'medium_term', limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener top artistas");
  }

  return await result.json();
}

// Obtener canciones reproducidas recientemente
async function fetchRecentlyPlayed(token, limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener canciones recientes");
  }

  return await result.json();
}

// Obtener playlists del usuario
async function fetchUserPlaylists(token, limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener playlists");
  }

  return await result.json();
}

// Obtener canciones guardadas (biblioteca)
async function fetchSavedTracks(token, limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener canciones guardadas");
  }

  return await result.json();
}

// Obtener álbumes guardados
async function fetchSavedAlbums(token, limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/me/albums?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener álbumes guardados");
  }

  return await result.json();
}

// Obtener reproducción actual
async function fetchCurrentlyPlaying(token) {
  const result = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (result.status === 204) {
    return null; // No hay reproducción activa
  }

  if (!result.ok) {
    throw new Error("Error al obtener reproducción actual");
  }

  return await result.json();
}

// Buscar canciones, artistas, álbumes, etc.
async function searchSpotify(token, query, type = 'track', limit = 20) {
  const encodedQuery = encodeURIComponent(query);
  const result = await fetch(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=${type}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error en la búsqueda");
  }

  return await result.json();
}

// Obtener recomendaciones basadas en seeds
async function fetchRecommendations(token, seedTracks = [], seedArtists = [], seedGenres = [], limit = 20) {
  const params = new URLSearchParams();
  params.append('limit', limit);
  
  if (seedTracks.length > 0) params.append('seed_tracks', seedTracks.join(','));
  if (seedArtists.length > 0) params.append('seed_artists', seedArtists.join(','));
  if (seedGenres.length > 0) params.append('seed_genres', seedGenres.join(','));

  const result = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener recomendaciones");
  }

  return await result.json();
}

// Obtener géneros disponibles para recomendaciones
async function fetchAvailableGenres(token) {
  const result = await fetch("https://api.spotify.com/v1/recommendations/available-genre-seeds", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener géneros disponibles");
  }

  return await result.json();
}

// Obtener detalles de un artista
async function fetchArtistDetails(token, artistId) {
  const result = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener detalles del artista");
  }

  return await result.json();
}

// Obtener álbumes de un artista
async function fetchArtistAlbums(token, artistId, limit = 20) {
  const result = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener álbumes del artista");
  }

  return await result.json();
}

// Obtener top tracks de un artista
async function fetchArtistTopTracks(token, artistId, country = 'ES') {
  const result = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${country}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    throw new Error("Error al obtener top tracks del artista");
  }

  return await result.json();
}

// Función para cargar todos los datos adicionales
async function loadAdditionalData(token) {
  try {
    // Cargar datos en paralelo para mejor rendimiento
    const [
      topTracks,
      topArtists,
      recentlyPlayed,
      playlists,
      savedTracks,
      currentlyPlaying
    ] = await Promise.allSettled([
      fetchTopTracks(token),
      fetchTopArtists(token),
      fetchRecentlyPlayed(token),
      fetchUserPlaylists(token),
      fetchSavedTracks(token),
      fetchCurrentlyPlaying(token)
    ]);

    // Mostrar los datos obtenidos
    if (topTracks.status === 'fulfilled') {
      displayTopTracks(topTracks.value);
    }
    
    if (topArtists.status === 'fulfilled') {
      displayTopArtists(topArtists.value);
    }
    
    if (recentlyPlayed.status === 'fulfilled') {
      displayRecentlyPlayed(recentlyPlayed.value);
    }
    
    if (playlists.status === 'fulfilled') {
      displayPlaylists(playlists.value);
    }
    
    if (savedTracks.status === 'fulfilled') {
      displaySavedTracks(savedTracks.value);
    }
    
    if (currentlyPlaying.status === 'fulfilled' && currentlyPlaying.value) {
      displayCurrentlyPlaying(currentlyPlaying.value);
    }

  } catch (error) {
    console.error("Error al cargar datos adicionales:", error);
  }
}

// Funciones para mostrar los datos en el DOM
function displayTopTracks(data) {
  const container = document.getElementById("topTracks");
  if (!container) return;
  
  container.innerHTML = "<h3>Tus Top Canciones</h3>";
  data.items.forEach((track, index) => {
    const trackElement = document.createElement("div");
    trackElement.innerHTML = `
      <p>${index + 1}. ${track.name} - ${track.artists.map(a => a.name).join(', ')}</p>
    `;
    container.appendChild(trackElement);
  });
}

function displayTopArtists(data) {
  const container = document.getElementById("topArtists");
  if (!container) return;
  
  container.innerHTML = "<h3>Tus Top Artistas</h3>";
  data.items.forEach((artist, index) => {
    const artistElement = document.createElement("div");
    artistElement.innerHTML = `
      <p>${index + 1}. ${artist.name} (${artist.genres.join(', ')})</p>
    `;
    container.appendChild(artistElement);
  });
}

function displayRecentlyPlayed(data) {
  const container = document.getElementById("recentlyPlayed");
  if (!container) return;
  
  container.innerHTML = "<h3>Reproducidas Recientemente</h3>";
  data.items.forEach(item => {
    const trackElement = document.createElement("div");
    trackElement.innerHTML = `
      <p>${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}</p>
      <small>Reproducida: ${new Date(item.played_at).toLocaleString()}</small>
    `;
    container.appendChild(trackElement);
  });
}

function displayPlaylists(data) {
  const container = document.getElementById("playlists");
  if (!container) return;
  
  container.innerHTML = "<h3>Tus Playlists</h3>";
  data.items.forEach(playlist => {
    const playlistElement = document.createElement("div");
    playlistElement.innerHTML = `
      <p><strong>${playlist.name}</strong> - ${playlist.tracks.total} canciones</p>
      <small>${playlist.description || 'Sin descripción'}</small>
    `;
    container.appendChild(playlistElement);
  });
}

function displaySavedTracks(data) {
  const container = document.getElementById("savedTracks");
  if (!container) return;
  
  container.innerHTML = "<h3>Canciones Guardadas</h3>";
  data.items.forEach(item => {
    const trackElement = document.createElement("div");
    trackElement.innerHTML = `
      <p>${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}</p>
      <small>Guardada: ${new Date(item.added_at).toLocaleDateString()}</small>
    `;
    container.appendChild(trackElement);
  });
}

function displayCurrentlyPlaying(data) {
  const container = document.getElementById("currentlyPlaying");
  if (!container) return;
  
  if (data && data.item) {
    container.innerHTML = `
      <h3>Reproduciendo Ahora</h3>
      <p><strong>${data.item.name}</strong> - ${data.item.artists.map(a => a.name).join(', ')}</p>
      <p>Álbum: ${data.item.album.name}</p>
      <p>Estado: ${data.is_playing ? 'Reproduciendo' : 'Pausado'}</p>
    `;
  } else {
    container.innerHTML = "<h3>No hay reproducción activa</h3>";
  }
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

// Funciones públicas que puedes llamar desde el exterior
window.SpotifyAPI = {
  // Funciones de búsqueda y datos
  search: (query, type = 'track', limit = 20) => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return searchSpotify(token, query, type, limit);
  },
  
  getRecommendations: (seedTracks = [], seedArtists = [], seedGenres = [], limit = 20) => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchRecommendations(token, seedTracks, seedArtists, seedGenres, limit);
  },
  
  getCurrentlyPlaying: () => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchCurrentlyPlaying(token);
  },
  
  getTopTracks: (timeRange = 'medium_term', limit = 20) => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchTopTracks(token, timeRange, limit);
  },
  
  getTopArtists: (timeRange = 'medium_term', limit = 20) => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchTopArtists(token, timeRange, limit);
  },
  
  getArtistDetails: (artistId) => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchArtistDetails(token, artistId);
  },
  
  getArtistTopTracks: (artistId, country = 'ES') => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return fetchArtistTopTracks(token, artistId, country);
  },
  
  // Función para refrescar datos
  refreshData: () => {
    const token = getStoredToken();
    if (!token) throw new Error("Token no disponible");
    return loadAdditionalData(token);
  },
  
  // Función para verificar estado del token
  checkToken: () => {
    const token = getStoredToken();
    return isTokenValid(token);
  }
};
