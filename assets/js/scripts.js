// script.js
document.addEventListener('DOMContentLoaded', () => {
    const verseCardsContainer = document.getElementById('verse-cards');
    const verseOfTheDayCard = document.getElementById('verse-of-the-day-card');
    const dropdownContent = document.getElementById('dropdown-content');
    const modal = document.getElementById('verse-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalVerse = document.getElementById('modal-verse');
    const modalTag = document.getElementById('modal-tag');
    const closeButton = document.querySelector('.close-button');

    function getDayOfWeek(dateString) {
        const date = new Date(dateString);
        const options = { weekday: 'long' };
        return date.toLocaleDateString(undefined, options);
    }

    function getVerseOfTheDay() {
        const today = new Date().toISOString().split('T')[0];
        return verses.find(verse => verse.date === today);
    }

    const verseOfTheDay = getVerseOfTheDay();

    if (verseOfTheDay) {
        const dayOfWeek = getDayOfWeek(verseOfTheDay.date);
        verseOfTheDayCard.innerHTML = `
            <div class="verse-of-the-day-title">Verse of the Day: ${dayOfWeek}</div>
            <div class="verse-of-the-day-content">${verseOfTheDay.verse}</div>
            <div class="verse-of-the-day-tag">${verseOfTheDay.tag}</div>
        `;
    }

    verses.forEach(verseData => {
        const verseDate = new Date(verseData.date);
        const today = new Date();

        if (verseDate < today) {
            const dayOfWeek = getDayOfWeek(verseData.date);
            const dropdownItem = document.createElement('a');
            dropdownItem.textContent = `${dayOfWeek} - ${verseData.tag}`;
            dropdownItem.href = "#";
            dropdownItem.addEventListener('click', () => {
                modalTitle.textContent = dayOfWeek;
                modalVerse.textContent = verseData.verse;
                modalTag.textContent = verseData.tag;
                modal.style.display = 'flex';
            });
            dropdownContent.appendChild(dropdownItem);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">${dayOfWeek}</div>
                <div class="card-content">${verseData.verse}</div>
                <div class="card-tag">${verseData.tag}</div>
            `;
            card.addEventListener('click', () => {
                modalTitle.textContent = dayOfWeek;
                modalVerse.textContent = verseData.verse;
                modalTag.textContent = verseData.tag;
                modal.style.display = 'flex';
            });
            verseCardsContainer.appendChild(card);
        }
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
