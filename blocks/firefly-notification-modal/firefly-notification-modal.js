export default function decorate(block) {
  console.log('🎨 [Firefly Notification Modal] Block decorated');
  let h2 = '';
  [...block.children].forEach(row => {
    console.log('Row:', row);
    const icon = row.querySelector('span.icon');
    if (!icon) {;
       console.log('H2:', h2);
       if (row.querySelector('div > p')) {
        console.log('Paragraph:', row);
        row.prepend(h2);
       } else {
        h2 = row.querySelector('div:has(h2)');
        row.remove();
       }
    }
  });
}
