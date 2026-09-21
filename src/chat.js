/* ============================================================
   Chat with Claude about ingredients you have or miss, recipes,
   meal prep. Claude can update the pantry and save recipes through
   tools; everything it does is shown in the conversation.
   ============================================================ */

const CHAT_TOOLS = [
  {
    name: 'update_pantry',
    description: 'Update the list of ingredients the person has at home. Use when they say they have, bought, used up or ran out of something.',
    input_schema: {type:'object', properties:{
      have: {type:'array', items:{type:'string'}, description:'Ingredients now at home'},
      ran_out: {type:'array', items:{type:'string'}, description:'Ingredients used up; they go on the shopping list'},
      remove: {type:'array', items:{type:'string'}, description:'Remove from the list entirely'}
    }}
  },
  {
    name: 'save_recipe',
    description: 'Save a complete recipe to the person\'s recipe collection. Only when they ask to save or keep it.',
    input_schema: RECIPE_SCHEMA
  },
  {
    name: 'show_recipe',
    description: 'Show a recipe card from the archive so the person can open it. Use the archive id.',
    input_schema: {type:'object', properties:{ recipe_id:{type:'string'} }, required:['recipe_id']}
  }
];

async function chatHistory(){
  const all = await recByType('chat_message');
  const thread = S.meta.chatThread || null;
  return all.filter(m => (m.thread || null) === thread).sort((a,b) => a.createdAt < b.createdAt ? -1 : 1);
}

function chatBubble(m){
  if (m.role === 'note') return '<div class="cnote tiny">'+esc(m.text)+'</div>';
  const body = m.role === 'assistant' ? mdLite(m.text || '') : esc(m.text || '').replace(/\n/g,'<br>');
  let extra = '';
  (m.cards || []).forEach(id => { const r = RECIPES.byId[id]; if (r) extra += recipeCard(r); });
  return '<div class="bubble '+(m.role === 'user' ? 'me' : 'ai')+'">'+body+(extra ? '<div class="rlist" style="margin-top:8px">'+extra+'</div>' : '')+'</div>';
}

/* Tiny markdown: bold, bullet lists, numbered lists, headings. Enough for chat. */
function mdLite(src){
  const lines = esc(src).split('\n');
  let out = '', list = null;
  const close = () => { if (list){ out += '</'+list+'>'; list = null; } };
  lines.forEach(line => {
    let l = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const ul = l.match(/^\s*[-•*]\s+(.*)$/), ol = l.match(/^\s*\d+[.)]\s+(.*)$/), hd = l.match(/^#{1,4}\s+(.*)$/);
    if (ul){ if (list !== 'ul'){ close(); out += '<ul>'; list = 'ul'; } out += '<li>'+ul[1]+'</li>'; }
    else if (ol){ if (list !== 'ol'){ close(); out += '<ol>'; list = 'ol'; } out += '<li>'+ol[1]+'</li>'; }
    else if (hd){ close(); out += '<p><b>'+hd[1]+'</b></p>'; }
    else if (!l.trim()){ close(); }
    else { close(); out += '<p>'+l+'</p>'; }
  });
  close();
  return out;
}

async function renderChat(){
  const host = $('#s-chat');
  const pantry = await recByType('pantry_item');
  const haveN = pantry.filter(p => p.have).length, buyN = pantry.filter(p => !p.have && p.toBuy).length;
  let h = '<div class="chatbar"><button class="chip" type="button" data-act="pantry">'+esc(t('pt_chip', {n: haveN}))+'</button>' +
    '<button class="chip" type="button" data-act="shopping">'+esc(t('pt_shop_chip', {n: buyN}))+'</button>' +
    '<button class="chip add" type="button" data-act="chat-new">'+esc(t('ch_new'))+'</button></div>';
  if (!S.secrets.anthropic) h += '<div class="notice warn">'+esc(t('ai_nokey_p'))+' <button class="linkbtn" type="button" data-act="go-settings">'+esc(t('open_settings'))+'</button></div>';
  const msgs = await chatHistory();
  h += '<div id="chatLog" class="chatlog">';
  if (!msgs.length) h += '<p class="tiny" style="text-align:center;margin:18px 0">'+esc(t('ch_empty'))+'</p>';
  msgs.forEach(m => { h += chatBubble(m); });
  h += '</div>';
  h += '<div class="chips scrollx" id="chatQuick">' + ['ch_q1','ch_q2','ch_q3','ch_q4'].map(k => '<button class="chip" type="button" data-q="'+k+'">'+esc(t(k))+'</button>').join('') + '</div>';
  h += '<div class="chatin"><textarea id="chatText" rows="1" placeholder="'+esc(t('ch_ph'))+'"></textarea>' +
    '<button class="btn" type="button" id="chatSend" aria-label="'+esc(t('ch_send'))+'">'+icon('send')+'</button></div>';
  host.innerHTML = h;
  fillThumbs(host);
  const ta = $('#chatText');
  if (S.chatSeed){ ta.value = S.chatSeed; S.chatSeed = null; }
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; });
  $('#chatSend').addEventListener('click', () => sendChat(ta.value));
  $('#chatQuick').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) sendChat(t(b.getAttribute('data-q'))); });
  const log = $('#chatLog');
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
  return log;
}

async function sendChat(text){
  text = String(text || '').trim();
  if (!text || S.chatBusy) return;
  if (!(await ensureAiReady())) return;
  S.chatBusy = true;
  const thread = S.meta.chatThread || null;
  await recPut({type:'chat_message', thread, role:'user', text}, {silent:true});
  const ta = $('#chatText'); if (ta){ ta.value = ''; ta.style.height = 'auto'; }
  const log = $('#chatLog');
  const emptyHint = log && log.querySelector('p.tiny'); if (emptyHint) emptyHint.remove();
  log.insertAdjacentHTML('beforeend', chatBubble({role:'user', text}));
  log.insertAdjacentHTML('beforeend', '<div class="bubble ai" id="liveBubble"><span class="typing"><i></i><i></i><i></i></span></div>');
  window.scrollTo(0, document.body.scrollHeight);
  const live = $('#liveBubble');
  let shown = '';
  const cards = [];
  try {
    const ctx = await buildContext({today:true, pantry:true, recipes:true});
    const system = 'You are the kitchen and nutrition companion inside NutriLog, a personal food diary. ' + langInstruction() +
      ' Help with what to cook from the ingredients at home, what is missing, substitutions, meal prep and nutrition questions. Prefer recipes from the person\'s archive (show them with show_recipe). Never suggest anything from the hard exclusions. Keep answers short and practical; use lists for ingredients and steps. When the person mentions having, buying or running out of ingredients, call update_pantry.\n\n' + ctx;
    const hist = (await chatHistory()).filter(m => m.role === 'user' || m.role === 'assistant').slice(-20);
    let messages = [];
    hist.forEach(m => {
      const txt = (m.text || '').trim() || '…';
      const last = messages[messages.length - 1];
      if (last && last.role === m.role) last.content += '\n\n' + txt;
      else messages.push({role: m.role, content: txt});
    });
    /* the API needs the conversation to start with the person */
    while (messages.length && messages[0].role !== 'user') messages.shift();
    for (let round = 0; round < 4; round++){
      const msg = await claudeStream({
        model: S.prefs.models.chat, max_tokens: 2500,
        system: [{type:'text', text: system, cache_control:{type:'ephemeral'}}],
        tools: CHAT_TOOLS, messages
      }, (delta) => { shown += delta; live.innerHTML = mdLite(shown); });
      const tools = msg.content.filter(b => b.type === 'tool_use');
      if (msg.stop_reason !== 'tool_use' || !tools.length) break;
      messages.push({role:'assistant', content: msg.content
        .filter(b => b.type === 'tool_use' || (b.type === 'text' && (b.text || '').trim()))
        .map(b => b.type === 'text' ? {type:'text', text: b.text} : {type:'tool_use', id: b.id, name: b.name, input: b.input})});
      const results = [];
      for (const tu of tools){
        const res = await runChatTool(tu, cards);
        results.push({type:'tool_result', tool_use_id: tu.id, content: res});
      }
      messages.push({role:'user', content: results});
      shown += shown && !shown.endsWith('\n') ? '\n\n' : '';
    }
    await recPut({type:'chat_message', thread, role:'assistant', text: shown.trim() || '…', cards}, {silent:true});
    live.outerHTML = chatBubble({role:'assistant', text: shown.trim() || '…', cards});
    fillThumbs($('#chatLog'));
    /* pantry counts may have changed through a tool call */
    const pantry = await recByType('pantry_item');
    const chips = $$('.chatbar .chip');
    if (chips.length >= 2){
      chips[0].textContent = t('pt_chip', {n: pantry.filter(p => p.have).length});
      chips[1].textContent = t('pt_shop_chip', {n: pantry.filter(p => !p.have && p.toBuy).length});
    }
  } catch(err){
    live.outerHTML = '<div class="notice bad">'+esc(t('err_prefix'))+'<div class="verbatim">'+esc(String(err.message||err))+'</div></div>';
  }
  S.chatBusy = false;
  window.scrollTo(0, document.body.scrollHeight);
}

async function runChatTool(tu, cards){
  const log = $('#chatLog');
  const note = (txt) => { log.insertAdjacentHTML('beforeend', '<div class="cnote tiny">'+esc(txt)+'</div>'); recPut({type:'chat_message', thread: S.meta.chatThread || null, role:'note', text: txt}, {silent:true}); };
  try {
    if (tu.name === 'update_pantry'){
      const inp = tu.input || {};
      const items = await recByType('pantry_item');
      const find = n => items.find(p => fold(p.name) === fold(n));
      const done = [];
      for (const n of (inp.have || [])){ const p = find(n); if (p){ p.have = true; p.toBuy = false; await recPut(p); } else await recPut({type:'pantry_item', name: n, have: true, toBuy: false}); done.push('+' + n); }
      for (const n of (inp.ran_out || [])){ const p = find(n); if (p){ p.have = false; p.toBuy = true; await recPut(p); } else await recPut({type:'pantry_item', name: n, have: false, toBuy: true}); done.push('−' + n); }
      for (const n of (inp.remove || [])){ const p = find(n); if (p) await recDelete(p.id); done.push('×' + n); }
      note(t('ch_pantry_done', {list: done.join(', ')}));
      return 'Pantry updated: ' + done.join(', ');
    }
    if (tu.name === 'save_recipe'){
      const r = recipeFromAi(tu.input || {}, 'claude');
      await saveRecipe(r);
      cards.push(r.id);
      note(t('ch_recipe_saved', {t: r.title}));
      return 'Saved with id ' + r.id;
    }
    if (tu.name === 'show_recipe'){
      const id = (tu.input || {}).recipe_id;
      if (RECIPES.byId[id]){ cards.push(id); return 'Shown to the person as a card.'; }
      return 'No recipe with that id.';
    }
  } catch(err){ return 'Error: ' + String(err.message || err); }
  return 'Unknown tool';
}

/* ---------- Pantry and shopping list ---------- */

async function openPantry(shopping){
  const items = (await recByType('pantry_item')).sort((a,b) => a.name.localeCompare(b.name, locale()));
  const list = shopping ? items.filter(p => !p.have && p.toBuy) : items;
  let b = '<p class="tiny" style="margin-bottom:10px">'+esc(t(shopping ? 'pt_shop_note' : 'pt_note'))+'</p>' +
    '<div class="inline"><div class="field"><input id="ptNew" type="text" placeholder="'+esc(t('pt_add_ph'))+'"></div>' +
    '<button class="btn none" type="button" id="ptAdd">'+esc(t('p_add'))+'</button></div><div id="ptList">';
  if (!list.length) b += '<p class="muted">'+esc(t(shopping ? 'pt_shop_empty' : 'pt_empty'))+'</p>';
  list.forEach(p => {
    b += '<div class="ptrow"><span class="it">'+esc(p.name)+'</span>' +
      '<button class="chip" type="button" data-pt="'+esc(p.id)+'" data-v="have" aria-pressed="'+(!!p.have)+'">'+esc(t('pt_have'))+'</button>' +
      '<button class="chip" type="button" data-pt="'+esc(p.id)+'" data-v="buy" aria-pressed="'+(!p.have && !!p.toBuy)+'">'+esc(t('pt_buy'))+'</button>' +
      '<button class="iconbtn sm" type="button" data-pt="'+esc(p.id)+'" data-v="del" aria-label="'+esc(t('p_remove'))+'">'+icon('trash')+'</button></div>';
  });
  b += '</div>';
  const sheet = openSheet(esc(t(shopping ? 'pt_shop_h' : 'pt_h')), b,
    shopping && list.length ? '<button class="btn quiet" type="button" id="ptCopy">'+esc(t('pt_copy'))+'</button><button class="btn" type="button" id="ptBought">'+esc(t('pt_bought_all'))+'</button>' : null, {tall:true});
  const add = async () => {
    const v = $('#ptNew').value.trim();
    if (!v) return;
    for (const n of v.split(',').map(x => x.trim()).filter(Boolean)){
      const ex = items.find(p => fold(p.name) === fold(n));
      if (ex){ ex.have = !shopping; ex.toBuy = !!shopping; await recPut(ex); }
      else await recPut({type:'pantry_item', name: n, have: !shopping, toBuy: !!shopping});
    }
    openPantry(shopping);
  };
  $('#ptAdd').addEventListener('click', add);
  $('#ptNew').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  sheet.addEventListener('click', async e => {
    const b2 = e.target.closest('[data-pt]');
    if (!b2) return;
    const p = items.find(x => x.id === b2.getAttribute('data-pt'));
    const v = b2.getAttribute('data-v');
    if (v === 'del') await recDelete(p.id);
    else if (v === 'have'){ p.have = true; p.toBuy = false; await recPut(p); }
    else if (v === 'buy'){ p.have = false; p.toBuy = true; await recPut(p); }
    openPantry(shopping);
  });
  const cp = $('#ptCopy');
  if (cp) cp.addEventListener('click', async () => {
    const txt = list.map(p => '- ' + p.name).join('\n');
    try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch(e){ toast(txt, 6000); }
  });
  const bo = $('#ptBought');
  if (bo) bo.addEventListener('click', async () => {
    for (const p of list){ p.have = true; p.toBuy = false; await recPut(p); }
    openPantry(true);
  });
}
