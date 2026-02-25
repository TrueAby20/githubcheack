(function () {
    const display = document.getElementById('display');
    const buttons = document.getElementById('buttons');
    const clearBtn = document.getElementById('clear');

    let current = '';

    buttons.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.classList.contains('btn')) return;
        const val = target.getAttribute('data-value');

        if (val === '=') {
            try {
                current = eval(current) + '';
            } catch (err) {
                current = 'Error';
            }
            display.value = current;
            return;
        }

        current += val;
        display.value = current;
    });

    clearBtn.addEventListener('click', () => {
        current = '';
        display.value = '';
    });
})();