// Swaps the poster link for the YouTube player only after the visitor asks for it,
// so no request reaches Google before a click. Without JavaScript the link opens YouTube.
document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('[data-player] .player__link') : null;
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const player = link.closest('[data-player]');
  const id = player.dataset.videoId || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  event.preventDefault();
  const frame = document.createElement('iframe');
  frame.className = 'player__frame';
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  frame.title = player.dataset.title || 'Video z YouTube';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  link.replaceWith(frame);
  frame.focus();
});
