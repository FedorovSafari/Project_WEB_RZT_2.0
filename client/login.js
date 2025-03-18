document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:5000/api/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка при входе');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token); // Сохраняем токен в localStorage
        window.location.href = 'index.html'; // Перенаправляем на главную страницу
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
});