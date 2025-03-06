chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "getPaperInfo") {
        let title = '';

        const titleSelectors = [
            'h1.title', // arXiv
            'h1.document-title', // IEEE
            'h1.citation__title', // ACM Digital Library
            'h1.article-title', // ScienceDirect
            'h1.c-article-title', // Springer
            'meta[name="citation_title"]', // Generic fallbacks
            'meta[property="og:title"]',
            'h1',
            'title'
        ]; // TODO: add cvf neurips support later. too lazy rn

        // brute force each selector until we find what document it is
        for (const selector of titleSelectors) {
            let element;

            if (selector.startsWith('meta')) {
                element = document.querySelector(selector);
                if (element) {
                    title = element.getAttribute('content');
                    break;
                }
            } else {
                element = document.querySelector(selector);
                if (element) {
                    title = element.textContent.trim();
                    break;
                }
            }
        }


        if (!title) {
            title = document.title;
        }

        sendResponse({ title: title });
    }

    return true;
});