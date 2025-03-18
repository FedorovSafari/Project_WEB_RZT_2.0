// Загружаем данные с сервера
async function loadData() {
    try {
        const response = await fetch('/api/data'); // Пример API-роута
        if (!response.ok) {
            throw new Error('Ошибка при загрузке данных');
        }
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Загружаем данные при загрузке страницы
window.onload = loadData;