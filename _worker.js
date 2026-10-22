export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cf = request.cf || {};

    const country = cf.country || "Desconocido";
    const city = cf.city || "Desconocido";
    const ip = request.headers.get("CF-Connecting-IP") || "Desconocido";
    const userAgent = request.headers.get("User-Agent") || "";

    const isBot = /Googlebot|Bingbot|Slurp|AhrefsBot|SemrushBot/i.test(userAgent);
    const isAdClick = url.searchParams.has("gclid");

    // ⚠️ RECOMENDADO: usa variables de entorno en Cloudflare, no las dejes aquí
    const TOKEN = env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = env.TELEGRAM_CHAT_ID;

    // ==============================
    // 1. REDIRECCIÓN A USUARIOS DE EE.UU.
    // ==============================
    if (
      country === "US" &&
      (path === "/" || path === "/index.html") &&
      !isBot &&
      !isAdClick
    ) {
      ctx.waitUntil(
        enviarTelegram(
          TOKEN,
          CHAT_ID,
          `🇺🇸 Visitante de EE.UU. redirigido a inglés\nCiudad: ${city}\nIP: ${ip}`
        )
      );
      return Response.redirect(new URL("/us.html", request.url).toString(), 302);
    }

    // ==============================
    // 2. NOTIFICACIÓN DE VISITA NORMAL
    // ==============================
    if (!isBot) {
      const esIngles = path.includes("us.html");
      const pageType = esIngles ? "Inglés 🇺🇸" : "Español 🇨🇴";

      ctx.waitUntil(
        enviarTelegram(
          TOKEN,
          CHAT_ID,
          `🌍 Nueva visita\nPágina: ${pageType}\nPaís: ${country}\nCiudad: ${city}\nIP: ${ip}\nRuta: ${path}`
        )
      );
    }

    // ==============================
    // 3. SERVIR LOS ARCHIVOS ESTÁTICOS
    // ==============================
    return env.ASSETS.fetch(request);
  }
};

// Función de envío a Telegram
async function enviarTelegram(token, chatId, text) {
  if (!token || !chatId) {
    console.error("Faltan credenciales de Telegram");
    return;
  }
  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
  } catch (e) {
    console.error("Error Fetch:", e);
  }
}
