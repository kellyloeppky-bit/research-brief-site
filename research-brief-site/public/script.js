document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('briefForm');
    const formSection = document.getElementById('formSection');
    const resultsSection = document.getElementById('resultsSection');
    const briefContent = document.getElementById('briefContent');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const copyBtn = document.getElementById('copyBtn');
    const newBriefBtn = document.getElementById('newBriefBtn');
    const copyNotification = document.getElementById('copyNotification');

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const companyName = document.getElementById('companyName').value.trim();
        const techStack = document.getElementById('techStack').value.trim();

        // Get selected competitors
        const competitorCheckboxes = document.querySelectorAll('input[name="competitors"]:checked');
        const competitors = Array.from(competitorCheckboxes).map(cb => cb.value);

        if (!companyName) {
            alert('Please enter a company name');
            return;
        }

        // Show loading overlay
        loadingOverlay.classList.add('show');

        try {
            const response = await fetch('/api/generate-brief', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    companyName,
                    techStack,
                    competitors
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate brief');
            }

            const data = await response.json();

            // Display results
            briefContent.textContent = data.brief;
            formSection.style.display = 'none';
            resultsSection.style.display = 'block';

            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while generating the brief. Please try again.');
        } finally {
            // Hide loading overlay
            loadingOverlay.classList.remove('show');
        }
    });

    // Copy to clipboard handler
    copyBtn.addEventListener('click', async function() {
        const text = briefContent.textContent;

        try {
            await navigator.clipboard.writeText(text);

            // Show notification
            copyNotification.classList.add('show');

            // Hide notification after 3 seconds
            setTimeout(() => {
                copyNotification.classList.remove('show');
            }, 3000);
        } catch (error) {
            console.error('Failed to copy:', error);

            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                copyNotification.classList.add('show');
                setTimeout(() => {
                    copyNotification.classList.remove('show');
                }, 3000);
            } catch (err) {
                alert('Failed to copy to clipboard');
            }

            document.body.removeChild(textArea);
        }
    });

    // New brief handler
    newBriefBtn.addEventListener('click', function() {
        // Reset form
        form.reset();

        // Show form, hide results
        formSection.style.display = 'block';
        resultsSection.style.display = 'none';

        // Scroll to form
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
