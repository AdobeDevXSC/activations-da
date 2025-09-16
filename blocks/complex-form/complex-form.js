export default async function decorate(block) {
  const overlay = document.createElement('div');
  overlay.className = 'form-overlay';
  [...block.children].forEach((row, index) => {
    if(row.querySelector('picture')) {
      row.className = 'form-background';
    }
    else {
      overlay.append(row)
    }
  });
  block.append(overlay);
}