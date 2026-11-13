const resumeLinks = document.querySelectorAll('[data-resume]');
const resumeHash = '#resume';
const pdfName = 'Елизавета Любшина CV.pdf';

if (resumeLinks.length && typeof HTMLDialogElement !== 'undefined' && HTMLDialogElement.prototype.showModal) {
  let dialog;
  let returnFocus;
  let previousHash = '';

  function openResume(trigger) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'resume-dialog';
      dialog.setAttribute('aria-labelledby', 'resume-title');
      dialog.innerHTML = `
  <div class="resume-dialog__panel">
    <header class="resume-dialog__bar">
      <h2 id="resume-title">Резюме</h2>
      <a class="btn" href="/${encodeURIComponent(pdfName)}" download="${pdfName}">Скачать PDF</a>
      <form method="dialog">
        <button class="resume-dialog__close" aria-label="Закрыть резюме" autofocus>×</button>
      </form>
    </header>
    <article class="resume-dialog__body">
      <h3>Продуктовый дизайнер UI/UX</h3>
      <p class="resume-dialog__name">Елизавета Любшина</p>
      <ul class="resume-dialog__contacts">
        <li><a href="/">Портфолио dizlik.ru</a></li>
        <li><a href="tel:+79163109453">+7 (916) 310-94-53</a></li>
        <li><a href="mailto:le-designer@yandex.ru">le-designer@yandex.ru</a></li>
        <li><a href="https://t.me/dizzzlik" target="_blank" rel="noopener">Telegram @dizzzlik</a></li>
      </ul>
      <p>5 лет в продуктовом дизайне. Специализируюсь на B2B-интерфейсах. Спроектировала интерфейс системы, в которой редакторы готовят субтитры и выпускают их в прямой эфир. На юзабилити-тестах подготовка субтитров к сюжету занимала в 2 раза меньше времени, чем в прежней системе.</p>
      <section>
        <h4>Опыт работы</h4>
        <div class="resume-dialog__job">
          <h5>VIDAU Systems <span>ПО для телеканалов</span></h5>
          <p class="resume-dialog__date">Июнь 2024 – август 2026, продуктовый дизайнер (UX/UI)</p>
          <ul>
            <li><strong>В 2 раза ускорила подготовку субтитров прямого эфира с проверкой на юзабилити-тестах.</strong> Спроектировала веб-редактор на замену зарубежному ПО. По итогам интервью с редакторами перестроила ключевые сценарии и сравнила время выполнения задач в двух системах.</li>
            <li><strong>Собрала дизайн-систему для 5 продуктов в команде из 6 дизайнеров.</strong> В библиотеке 85 компонентов и 300+ вариантов. Отвечала за аудит, состояния и варианты, правила использования и шаблон документации.</li>
            <li><strong>С 10 до 1 минуты сократила время реакции инженеров на сбой.</strong> Спроектировала мобильное приложение, которое сразу уведомляет инженеров о сбоях. Приложение выпущено.</li>
            <li><strong>Спроектировала демо мониторинга спутниковых группировок для выставки «Связь».</strong> Демо показывали на стенде и использовали в презентационном видео.</li>
          </ul>
        </div>
        <div class="resume-dialog__job">
          <h5>Трэктис <span>Видеоаналитика для транспорта</span></h5>
          <p class="resume-dialog__date">Август 2023 – май 2024, продуктовый дизайнер (UX/UI), единственный дизайнер</p>
          <ul>
            <li><strong>В 2 раза увеличила число заявок с сайта компании после редизайна на Tilda.</strong> Отслеживала результат в веб-аналитике.</li>
            <li><strong>С 30 до 15 минут сократила время калибровки камеры в автобусе.</strong> Спроектировала админ-панель настройки оборудования для подсчёта пассажиров и проверяла реализацию.</li>
            <li><strong>Собрала UI Kit продукта в новом фирменном стиле.</strong></li>
          </ul>
        </div>
        <div class="resume-dialog__job">
          <h5>Flareon <span>Сервис мониторинга цен</span></h5>
          <p class="resume-dialog__date">Июнь 2021 – май 2023, UX/UI-дизайнер, единственный дизайнер продукта</p>
          <ul>
            <li><strong>3 формата для сравнения цен и отслеживания их динамики.</strong> Спроектировала дашборды с линейными графиками, столбчатыми диаграммами и таблицами. Предусмотрела переход от сравнения цен к истории цены конкретного товара.</li>
            <li><strong>Собрала UI-кит в Figma на базе Material Design.</strong> Адаптировала компоненты и цветовую палитру под единый стиль интерфейса.</li>
          </ul>
        </div>
      </section>
      <section>
        <h4>Личный проект</h4>
        <p>116 экранов с состояниями в дизайне приложения для силовых тренировок. Спроектировала интерактивный прототип на 8 сценариев с 425 связями и собрала 31 набор компонентов. Контраст по WCAG AA. <a href="/cases/gym-bro.html">Кейс в портфолио</a></p>
      </section>
      <section>
        <h4>Навыки</h4>
        <dl>
          <div><dt>Проектирование</dt><dd>Веб-интерфейсы, мобильные приложения, админ-панели, дашборды, пользовательские сценарии, информационная архитектура, прототипирование, дизайн-ревью, доступность (WCAG)</dd></div>
          <div><dt>Исследования</dt><dd>Интервью, юзабилити-тестирование, проверка гипотез, UX-метрики, анализ конкурентов</dd></div>
          <div><dt>Дизайн-системы</dt><dd>Дизайн-токены, компоненты, варианты и состояния, UI-киты, Auto Layout, документация</dd></div>
          <div><dt>Инструменты</dt><dd>Figma, Miro, Photoshop, Illustrator, Tilda, Jira, Confluence, Яндекс Трекер, Яндекс Вики, ChatGPT, Codex</dd></div>
        </dl>
      </section>
      <section>
        <h4>Образование и языки</h4>
        <p>РУДН, Инженерная академия, прикладная математика и информатика, бакалавр, 2020<br>
          Русский — родной, английский — Intermediate (B1)</p>
      </section>
    </article>
  </div>
      `;
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (location.hash === resumeHash) {
          history.replaceState(history.state, '', location.pathname + location.search + previousHash);
        }
        previousHash = '';
        returnFocus?.focus({ preventScroll: true });
      });
      document.body.append(dialog);
    }

    if (dialog.open) return;
    const navToggle = document.querySelector('.nav__toggle');
    const desktopLink = document.querySelector('.nav__links [data-resume]');
    returnFocus = trigger
      ? (trigger.closest('.nav__menu') ? navToggle : trigger)
      : (desktopLink?.getClientRects().length ? desktopLink : navToggle);
    dialog.showModal();
    dialog.querySelector('.resume-dialog__body').scrollTop = 0;
  }

  for (const link of resumeLinks) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();

      if (location.hash !== resumeHash) {
        previousHash = location.hash;
        history.replaceState(history.state, '', resumeHash);
      }
      openResume(link);
    });
  }

  function syncResumeHash() {
    if (location.hash === resumeHash) openResume();
    else if (dialog?.open) dialog.close();
  }

  window.addEventListener('hashchange', syncResumeHash);
  syncResumeHash();
}
