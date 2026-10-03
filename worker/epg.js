const Config = {
    repository: 'live.fanmingming.com'
};

async function jq_fetch(request) {
    let response = await fetch(request);
    for (let i = 0; i < 5 && (response.status === 301 || response.status === 302 || response.redirected); i++) {
        const location = response.headers.get('location') || response.url;
        response = await fetch(new Request(location, { headers: { cookie: response.headers.get('set-cookie') } }));
    }
    return response;
}

function makeRes(body, status = 200, headers = { 'access-control-allow-origin': '*' }) {
    return new Response(body, { status, headers });
}

function formatDateTime(time = '') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    if (time.length < 8) return { date: defaultDate, time: '' };

    const [inputYear, inputMonth, inputDay] = [time.substring(0, 4), time.substring(4, 6), time.substring(6, 8)];
    const formattedDate = `${inputYear}-${inputMonth}-${inputDay}`;
    const formattedTime = time.length >= 12 ? `${time.substring(8, 10)}:${time.substring(10, 12)}` : '';

    return { date: formattedDate, time: formattedTime };
}

async function diypHandle(channel, date, request) {
    const tag = date.replace(/-/g, '.');
    const res = await jq_fetch(new Request(`https://github.com/celetor/epg/releases/download/${tag}/112114.json`, request));
    if (!res.ok) throw new Error(`EPG fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid EPG data format');

    const program_info = {
        date,
        channel_name: channel,
        url: `https://${Config.repository}`,
        epg_data: data.filter(element => element['@channel'] === channel && element['@start'].startsWith(date.replace(/-/g, '')))
                      .map(element => ({
                          start: formatDateTime(element['@start']).time,
                          end: formatDateTime(element['@stop']).time,
                          title: element['title']['#text'] || '未知节目',
                          desc: element['desc']?.['#text'] || ''
                      }))
    };

    if (program_info.epg_data.length === 0) {
        program_info.epg_data.push({ start: "00:00", end: "23:59", title: "未知节目", desc: "" });
    }

    return makeRes(JSON.stringify(program_info), 200, { 'content-type': 'application/json' });
}

async function fetchHandler(event) {
    const request = event.request;
    const url = new URL(request.url);

    if (url.pathname === '/' && !url.searchParams.has('ch')) {
        return Response.redirect(`https://${Config.repository}/e.xml`, 302);
    }

    const channel = (url.searchParams.get("ch") || '').toUpperCase().replace(/-/g, '');
    const dateParam = url.searchParams.get("date");
    const date = formatDateTime(dateParam ? dateParam.replace(/\D+/g, '') : '').date;

    if (parseInt(date.replace(/-/g, '')) >= 20240531) {
        return diypHandle(channel, date, request);
    } else {
        return makeRes(JSON.stringify({
            date,
            channel_name: channel,
            url: `https://${Config.repository}`,
            epg_data: [{ start: "00:00", end: "23:59", title: "未知节目", desc: "" }]
        }), 200, { 'content-type': 'application/json' });
    }
}

addEventListener('fetch', event => {
    event.respondWith(fetchHandler(event).catch(err => makeRes(`error:\n${err.stack}`, 502)));
});
