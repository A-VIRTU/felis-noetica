// Cloudflare Pages Function: POST /api/rezervace
// Přijímá nezávaznou předběžnou rezervaci koťat na rok 2027
// a bezpečně ji ukládá jako komentář k vyhrazenému neveřejnému příspěvku ve WordPressu (Post ID 2243).

export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/json')) {
      data = await context.request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'Nepodporovaný formát požadavku.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const jmeno = (data.jmeno || '').trim();
    const email = (data.email || '').trim();
    const telefon = (data.telefon || '').trim();
    const preference = (data.preference || '').trim();
    const poznamka = (data.poznamka || '').trim();

    if (!jmeno || !email || !telefon) {
      return new Response(JSON.stringify({ ok: false, error: 'Vyplňte prosím jméno, e-mail i telefon.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Základní ověření e-mailu
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Zadejte prosím platnou e-mailovou adresu.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Sestavení obsahu komentáře
    const casZaznamu = new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
    const radky = [
      `Zájemce: ${jmeno}`,
      `E-mail: ${email}`,
      `Telefon: ${telefon}`,
      `Preference: ${preference || 'Nerozhoduje / poradím se'}`,
      ``,
      `Poznámka / vzkaz:`,
      poznamka ? poznamka : '—',
      ``,
      `---`,
      `Předběžná rezervace z webu felisnoetica.cz přijata: ${casZaznamu}`
    ];
    const commentContent = radky.join('\n');

    // WP Post ID 2243 na probystrc.cz
    const wpPostId = 2243;
    const authHeader = 'Basic ' + btoa('viktorlostak:2vw2 mHxn LZur yYPd GQMO ltk4');

    const wpRes = await fetch('https://probystrc.cz/wp-json/wp/v2/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'FelisNoetica-Rezervace/1.0'
      },
      body: JSON.stringify({
        post: wpPostId,
        author_name: jmeno,
        author_email: email,
        status: 'approved',
        content: commentContent
      })
    });

    if (!wpRes.ok) {
      const errText = await wpRes.text();
      console.error('WP API error:', wpRes.status, errText);
      return new Response(JSON.stringify({ ok: false, error: 'Chyba při ukládání do systému.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const wpData = await wpRes.json();
    return new Response(JSON.stringify({ ok: true, id: wpData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    console.error('Rezervace endpoint error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Neočekávaná chyba serveru při zpracování rezervace.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
