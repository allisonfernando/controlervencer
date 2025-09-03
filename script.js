// ================= IndexedDB =================
let db, products=[];
const request=indexedDB.open('ControlerVencerDB',1);
request.onupgradeneeded=e=>{
  db=e.target.result;
  if(!db.objectStoreNames.contains('products')) db.createObjectStore('products',{keyPath:'id', autoIncrement:true});
};
request.onsuccess=e=>{ db=e.target.result; loadProducts(); };
request.onerror=e=>console.error('Erro IndexedDB', e);

// ================= Navegação =================
function showPage(pageId, tabId){
  document.getElementById('productPage').style.display='none';
  document.getElementById('menuPage').style.display='none';
  document.getElementById(pageId).style.display='flex';
  document.getElementById('tabProdutos').classList.remove('active');
  document.getElementById('tabCardapio').classList.remove('active');
  if(tabId) document.getElementById(tabId).classList.add('active');
}

// ================= Produtos =================
const productForm=document.getElementById('productForm');
const productList=document.getElementById('productList');
const alertContainer=document.getElementById('alertContainer');

productForm.addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('productName').value.trim();
  const type=document.getElementById('productType').value;
  const entryDate=document.getElementById('entryDate').value;
  const expiryDate=document.getElementById('expiryDate').value;
  const quantity=parseFloat(document.getElementById('quantity').value);
  const imageInput=document.getElementById('productImage');
  const editIndex=document.getElementById('editIndex').value;

  if(!name || !type || !entryDate || !expiryDate || !quantity){ alert("Preencha todos os campos."); return; }

  const reader=new FileReader();
  reader.onload=function(){
    const imageData=reader.result||'';
    const productData={name,type,entryDate,expiryDate,quantity,image:imageData};
    const tx=db.transaction('products','readwrite');
    const store=tx.objectStore('products');
    if(editIndex==='') store.add(productData);
    else { productData.id=parseInt(editIndex); store.put(productData); }
    tx.oncomplete=()=>{ loadProducts(); productForm.reset(); document.getElementById('editIndex').value=''; };
  };
  if(imageInput.files && imageInput.files[0]) reader.readAsDataURL(imageInput.files[0]);
  else reader.onload();
});

function daysUntil(dateStr){
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(dateStr); d.setHours(0,0,0,0);
  return Math.ceil((d-today)/(1000*60*60*24));
}

// ================= Render Products =================
function loadProducts(){
  const tx=db.transaction('products','readonly');
  const store=tx.objectStore('products');
  const getAll=store.getAll();
  getAll.onsuccess=function(){
    products=getAll.result||[];
    renderProducts();
    renderAlerts();
  };
}

function renderProducts(){
  productList.innerHTML='';
  const sortedProducts = products.slice().sort((a,b)=> daysUntil(a.expiryDate)-daysUntil(b.expiryDate) );
  sortedProducts.forEach(prod=>{
    const card=document.createElement('div'); 
    card.className='product-card';
    const diffDays=daysUntil(prod.expiryDate);

    let badgeText='', badgeBg='#43a047';
    if(diffDays<0){ badgeText='VENCIDO'; badgeBg='#b71c1c'; }
    else if(diffDays<=5){ badgeText=diffDays+' dias'; badgeBg='#e53935'; }
    else if(diffDays<=10){ badgeText=diffDays+' dias'; badgeBg='#ff8c00'; }
    else if(diffDays<=15){ badgeText=diffDays+' dias'; badgeBg='#fdd835'; }
    else{ badgeText=diffDays+' dias'; badgeBg='#43a047'; }

    const badge=document.createElement('div'); 
    badge.className='product-badge'; 
    badge.textContent=badgeText; 
    badge.style.backgroundColor=badgeBg;

    const img=document.createElement('img'); img.src=prod.image||'';
    const h4=document.createElement('h4'); h4.textContent=prod.name;
    const p1=document.createElement('p'); p1.textContent=`Tipo: ${prod.type}`;
    const p2=document.createElement('p'); p2.textContent=`Qtd: ${prod.quantity}g`;
    const p3=document.createElement('p'); p3.textContent=`Venc: ${prod.expiryDate}`;
    
    const btnDiv=document.createElement('div'); btnDiv.className='card-buttons';
    const editBtn=document.createElement('button'); editBtn.className='edit-btn'; editBtn.textContent='Editar';
    editBtn.onclick=()=>editProduct(prod.id);
    const removeBtn=document.createElement('button'); removeBtn.className='remove-btn'; removeBtn.textContent='Remover';
    removeBtn.onclick=()=>removeProduct(prod.id);
    btnDiv.appendChild(editBtn); btnDiv.appendChild(removeBtn);

    card.appendChild(img); 
    card.appendChild(h4); 
    card.appendChild(p1); 
    card.appendChild(p2); 
    card.appendChild(p3); 
    card.appendChild(badge); 
    card.appendChild(btnDiv);

    productList.appendChild(card);
  });
}

// ================= Render Alerts =================
function renderAlerts(){
  alertContainer.innerHTML='';

  const vencidos = products.filter(p => daysUntil(p.expiryDate)<0);
  const cincoDias = products.filter(p => daysUntil(p.expiryDate) >=0 && daysUntil(p.expiryDate) <=5);
  const dezDias = products.filter(p => daysUntil(p.expiryDate) >=6 && daysUntil(p.expiryDate) <=10);
  const quinzeDias = products.filter(p => daysUntil(p.expiryDate) >=11 && daysUntil(p.expiryDate) <=15);
  const validos = products.filter(p => daysUntil(p.expiryDate) >15);

  const addAlert = (arr, className, label) => {
    if(arr.length>0){
      const box=document.createElement('div');
      box.className='alert-box '+className;
      box.textContent=`${label} ${arr.map(p=>p.name).join(', ')}`;
      alertContainer.appendChild(box);
    }
  };

  addAlert(vencidos, 'alert-vencido', '⚠️ Produtos vencidos:');
  addAlert(cincoDias, 'alert-5dias', '⚠️ Produtos a vencer em até 5 dias:');
  addAlert(dezDias, 'alert-10dias', '⚠️ Produtos a vencer de 6 a 10 dias:');
  addAlert(quinzeDias, 'alert-15dias', '⚠️ Produtos a vencer de 11 a 15 dias:');
  addAlert(validos, 'alert-16dias', '✅ Produtos válidos:');
}

function editProduct(id){
  const prod=products.find(p=>p.id===id);
  if(!prod) return;
  document.getElementById('productName').value=prod.name;
  document.getElementById('productType').value=prod.type;
  document.getElementById('entryDate').value=prod.entryDate;
  document.getElementById('expiryDate').value=prod.expiryDate;
  document.getElementById('quantity').value=prod.quantity;
  document.getElementById('editIndex').value=prod.id;
}

function removeProduct(id){
  if(!confirm('Deseja remover este produto?')) return;
  const tx=db.transaction('products','readwrite');
  tx.objectStore('products').delete(id);
  tx.oncomplete=()=>loadProducts();
}

// ================= Gerador de Jantar =================
function generateDinner(){
  const studentCount=parseInt(document.getElementById('studentCount').value);
  if(isNaN(studentCount) || studentCount<=0){ alert("Informe uma quantidade válida de alunos."); return; }

  const portions={Arroz:100, Feijão:80, Carne:120, Salada:50};
  const menuDiv=document.getElementById('menuResult'); menuDiv.innerHTML='';

  Object.keys(portions).forEach(type=>{
    const totalGrams = portions[type]*studentCount;
    const totalKg = (totalGrams/1000).toFixed(2);
    const card=document.createElement('div'); card.className='food-card';
    card.innerHTML=`<span>${type}</span><span>${totalKg} kg</span>`;
    menuDiv.appendChild(card);
  });
}
