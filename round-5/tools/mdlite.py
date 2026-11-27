"""Tiny Markdown subset renderer (headings, paragraphs, lists, tables, code fences, quotes, rules)."""
import html, re
e = html.escape


def inline(s):
    s = e(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    return s


def md(text, shift=1):
    """Small Markdown subset: headings, paragraphs, lists (2 levels), tables, code fences, quotes, rules."""
    out, lines, i = [], text.split('\n'), 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith('```'): buf.append(lines[j]); j += 1
            out.append('<pre><code>' + e('\n'.join(buf)) + '</code></pre>'); i = j + 1; continue
        m = re.match(r'^(#{1,6})\s+(.*)', ln)
        if m:
            lvl = min(6, len(m.group(1)) + shift); out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>'); i += 1; continue
        if re.match(r'^\s*\|', ln):
            rows = []
            while i < len(lines) and re.match(r'^\s*\|', lines[i]): rows.append(lines[i]); i += 1
            cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
            body = [c for c in cells[1:] if not all(re.match(r'^:?-+:?$', x) for x in c)]
            out.append('<div class="tbl"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells[0]) + '</tr></thead><tbody>' +
                       ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in body) + '</tbody></table></div>')
            continue
        if re.match(r'^\s*([-*]|\d+\.)\s+', ln):
            ordered = bool(re.match(r'^\s*\d+\.', ln)); tag = 'ol' if ordered else 'ul'; items = []
            while i < len(lines) and (re.match(r'^\s*([-*]|\d+\.)\s+', lines[i]) or (lines[i].startswith('  ') and lines[i].strip())):
                l = lines[i]
                if re.match(r'^\s{2,}([-*]|\d+\.)\s+', l) and items: items[-1][1].append(re.sub(r'^\s*([-*]|\d+\.)\s+', '', l))
                elif re.match(r'^\s*([-*]|\d+\.)\s+', l): items.append([re.sub(r'^\s*([-*]|\d+\.)\s+', '', l), []])
                elif items: items[-1][0] += ' ' + l.strip()
                i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(a)}' + (('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in sub) + '</ul>') if sub else '') + '</li>' for a, sub in items) + f'</{tag}>')
            continue
        if ln.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].startswith('>'): buf.append(lines[i].lstrip('> ')); i += 1
            out.append('<blockquote>' + inline(' '.join(buf)) + '</blockquote>'); continue
        if re.match(r'^\s*(-{3,}|\*{3,})\s*$', ln): out.append('<hr>'); i += 1; continue
        if not ln.strip(): i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|```|\s*\||\s*([-*]|\d+\.)\s|>)', lines[i]): buf.append(lines[i].strip()); i += 1
        out.append('<p>' + inline(' '.join(buf)) + '</p>')
    return '\n'.join(out)


def sections(report_md):
    """Split a REPORT.md into (title, html) by its ## headings; drop the top # title."""
    body = re.sub(r'^#\s+.*\n', '', report_md, count=1)
    parts = re.split(r'^##\s+(.+)$', body, flags=re.M)
    intro = md(parts[0], 2) if parts[0].strip() else ''
    return intro, [(parts[k].strip(), md(parts[k + 1], 2)) for k in range(1, len(parts), 2)]
