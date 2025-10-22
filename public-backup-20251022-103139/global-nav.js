// Global navigation functions for all pages

// Show Log Food Menu - works on all pages
function showLogFoodMenu() {
    // If we're on index.html, the modal exists
    const modal = document.getElementById('logFoodModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        // If we're on a different page, redirect to index.html and show modal
        window.location.href = 'index.html#logfood';
    }
}

// Close Log Food Menu
function closeLogFoodMenu() {
    const modal = document.getElementById('logFoodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Check if we should show log food modal on page load (for redirects)
if (window.location.hash === '#logfood') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(showLogFoodMenu, 100);
        });
    } else {
        setTimeout(showLogFoodMenu, 100);
    }
    // Clear the hash
    history.replaceState(null, null, window.location.pathname);
}
