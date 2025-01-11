function toggleCompose() {
    const composeDiv = document.getElementById('compose-div');
    if (composeDiv.style.display === 'none' || !composeDiv.style.display) {
        composeDiv.style.display = 'block';
    } else {
        composeDiv.style.display = 'none';
    }
}

document.getElementById('compose-icon').addEventListener('click', toggleCompose);
document.getElementById('close-compose').addEventListener('click', toggleCompose);
