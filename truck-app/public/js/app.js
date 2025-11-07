document.addEventListener('DOMContentLoaded', ()=> {
  const modal = document.getElementById('login-modal');
  const openBtn = document.getElementById('btn-open-login');
  const closeBtn = document.getElementById('close-login');
  const loginForm = document.getElementById('login-form');
  const btnPanel = document.getElementById('btn-panel');

  function showModal(){ modal.classList.remove('hidden'); }
  function hideModal(){ modal.classList.add('hidden'); }

  if(openBtn) openBtn.onclick = showModal;
  if(btnPanel) btnPanel.onclick = showModal;
  if(closeBtn) closeBtn.onclick = () => {
    hideModal();
    // при нажатии крестика - перейти на новости
    window.location.href = '/news.html';
  };

  if(loginForm) loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = new FormData(loginForm);
    const body = { username: data.get('username'), password: data.get('password') };
    const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      hideModal();
      // перенаправить по роли
      if(json.role === 'driver') window.location.href = '/profile.html';
      else window.location.href = '/profile.html';
    } else {
      alert('Неверный логин/пароль');
    }
  });

  // NEWS preview slider
  const newsEl = document.getElementById('news-preview');
  async function loadNews(){
    if(!newsEl) return;
    const resp = await fetch('/api/news');
    const items = await resp.json();
    if(!items.length){ newsEl.innerHTML = '<p>Новости отсутствуют</p>'; return; }
    let idx = 0;
    function render(){
      const it = items[idx];
      newsEl.innerHTML = `
        <div class="news-card">
          <img src="${it.image || 'images/placeholder.jpg'}" alt="">
          <h3>${it.title}</h3>
          <p>${it.summary}</p>
          <button class="link-btn" data-id="${it.id}">Читать полностью</button>
        </div>
        <div class="slider-controls">
          <button id="prev" ${idx===0?'disabled':''}>◀</button>
          <button id="next" ${idx===items.length-1?'disabled':''}>▶</button>
        </div>
      `;
      document.getElementById('prev').onclick = ()=>{ idx = Math.max(0, idx-1); render(); };
      document.getElementById('next').onclick = ()=>{ idx = Math.min(items.length-1, idx+1); render(); };
      newsEl.querySelector('.link-btn').onclick = (e)=> {
        const id = e.target.dataset.id;
        window.location.href = `/news_full.html?id=${id}`;
      };
    }
    render();
  }
  loadNews();
});