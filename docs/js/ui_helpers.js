// ui_helpers.js

function showGenericSpinner() {
    $("#loadingSpinner").css('display', 'flex');
}

function hideGenericSpinner() {
    $("#loadingSpinner").css('display', 'none');
}

// Tolerates a missing or placeholder date, because 133 ladings have one. This threw
// on `undefined.split`, which killed renderTable mid-loop — and since #resultCount is
// written on renderTable's first line, the page was left claiming "(1 lading)" over an
// empty table with the failure only in the console (#41).
function formatDate(dateString) {
    if (!dateString) return "";
    const [year, month_number, day] = String(dateString).split('-').map(Number);
    if (!year || !month_number || !day) return "";   // the 0000-01-01 placeholder
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[month_number - 1];
    if (!month) return "";
    return `${day} ${month} ${year}`;
}

function getCustomYear(date) {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || year === 0) return null;
    const startDate = new Date(year, 8, 29);
    const endDate = new Date(year + 1, 8, 28);
    const currentDate = new Date(year, month - 1, day);
    return currentDate >= startDate && currentDate <= endDate ? year : year - 1;
}

function renderCargosList($container, cargos) {
    $container.empty();
    const footnotes = $container.data("footnotes") || [];
    cargos.forEach(cargo => {
        const annotatedText = applyOffsetAnnotations(cargo.cargo || "", cargo.annotations, footnotes || []);
        const $cargoItem = $("<li></li>").html(annotatedText);
        $container.append($cargoItem);
    });
    if (cargos.length === 0) {
        $container.html("<li>No cargos found.</li>");
    }
}

async function copyToClipboard(text, targetElement) {
    try {
        // Use document.execCommand('copy') for broader iframe compatibility
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        textarea.style.opacity = '0'; // Make it invisible
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand('copy');
        document.body.removeChild(textarea);

        // Visual feedback: Temporarily change icon
        if (targetElement) {
            const originalIconClass = targetElement.data('original-icon-class');
            const originalColorClass = targetElement.data('original-color-class');
            const originalWidth = targetElement.outerWidth();
            targetElement.css('display', 'inline-block');
            targetElement.css('width', originalWidth + 'px');

            targetElement.removeClass(originalIconClass).addClass('fa-check text-success');
            setTimeout(() => {
                targetElement.removeClass('fa-check text-success')
                    .addClass(originalIconClass)
                    .addClass(originalColorClass)
                    .css('width', '');
            }, 1500); // Revert after 1.5 seconds
        }
        console.log('Text copied to clipboard:', text);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers or if execCommand fails
        if (targetElement) {
            const originalIconClass = targetElement.data('original-icon-class');
            targetElement.removeClass(originalIconClass).addClass('fa-times text-danger');
            setTimeout(() => {
                targetElement.removeClass('fa-times text-danger').addClass(originalIconClass);
            }, 1500);
        }
    }
}

function plurals(number, singular, plural) {
    return `${number.toLocaleString()} ${number === 1 ? singular : plural}`;
}

function upperFirst(str = "") {
    if (typeof str !== 'string' || str.length === 0) {
        return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function collectRegexes(ast, list = []) {
    if (ast.type === 'TERM') {
        list.push(compileRegex(ast.value));
    } else {
        collectRegexes(ast.left, list);
        collectRegexes(ast.right, list);
    }
    return list;
}

function highlightMatches($container, searchQuery) {
    if (!searchQuery.trim()) return;

    const originalText = $container.text();
    const lowerText = originalText.toLowerCase();

    // Build regex AST from the search query
    let regexes;
    try {
        const tokens = tokenize(searchQuery);
        const ast = parse(tokens);
        regexes = collectRegexes(ast);
    } catch (err) {
        console.warn("Search query parsing failed:", err);
        return;
    }

    let matchIndexes = [];

    regexes.forEach(re => {
        let match;
        while ((match = re.exec(lowerText)) !== null) {
            if (!match[0]) continue; // protect against empty match
            const start = match.index;
            const end = start + match[0].length;
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                matchIndexes.push({ start, end });
            }
            // Prevent infinite loop on zero-width matches
            if (re.lastIndex === match.index) re.lastIndex++;
        }
    });

    if (!matchIndexes.length) return;

    const walker = document.createTreeWalker($container[0], NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let totalOffset = 0;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const length = node.textContent.length;
        textNodes.push({ node, start: totalOffset, end: totalOffset + length });
        totalOffset += length;
    }

    function findOffset(offset) {
        for (const { node, start, end } of textNodes) {
            if (offset >= start && offset < end) {
                return { node, localOffset: offset - start };
            }
        }
        return null;
    }

    // Highlight in reverse order
    $(matchIndexes.reverse()).each(function (_, { start, end }) {
        const startInfo = findOffset(start);
        const endInfo = findOffset(end - 1); // Inclusive

        if (!startInfo || !endInfo) return;

        const range = document.createRange();
        range.setStart(startInfo.node, startInfo.localOffset);
        range.setEnd(endInfo.node, endInfo.localOffset + 1);

        const wrapper = document.createElement("span");
        wrapper.className = "double-underline";

        try {
            const contents = range.extractContents();
            wrapper.appendChild(contents);
            range.insertNode(wrapper);
        } catch (e) {
            console.warn("Highlight failed on range:", e);
        }
    });
}
