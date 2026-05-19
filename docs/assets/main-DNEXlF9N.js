import{c as v}from"./index-CMzVDswU.js";const b="https://ehxsodyuzpduggxbffmk.supabase.co",h="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",m="5493513278986",w=v(b,h);let c=[],a=JSON.parse(localStorage.getItem("cart_pro"))||[];async function I(){lucide.createIcons(),$(),await E(),r(),x()}function $(){document.getElementById("openCart").onclick=i,document.getElementById("closeCart").onclick=i,document.getElementById("cartOverlay").onclick=i,document.getElementById("closeModal").onclick=d,document.getElementById("productModal").onclick=e=>{e.target===document.getElementById("productModal")&&d()},document.getElementById("checkoutBtn").onclick=y}async function E(){try{const{data:e,error:t}=await w.from("productos").select("*").order("created_at",{ascending:!1});if(t)throw t;c=e,B(),document.getElementById("productCount").textContent=`${c.length} PRODUCTOS`}catch(e){console.error("Error fetching products:",e),document.getElementById("productGrid").innerHTML=`
                    <div class="col-span-full py-20 text-center text-red-500">
                        <p>Ups! No pudimos cargar los productos.</p>
                        <p class="text-sm opacity-50">${e.message}</p>
                    </div>
                `}}
const style = document.createElement('style');
style.textContent = `
    #productModal.visible { display: flex !important; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; background: rgba(0,0,0,0.5); }
    #productModal > div { max-width: 500px !important; width: 95% !important; max-height: 90vh !important; overflow-y: auto !important; background: white; border-radius: 1.5rem; position: relative; margin: auto; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
    #modalImg { max-height: 45vh !important; width: 100% !important; object-fit: contain !important; background: #f8fafc; display: block; }
    .dark-mode #productModal > div { background: #0f172a !important; color: #f8fafc !important; border: 1px solid #1e293b; }
    .dark-mode #modalImg { background: #1e293b !important; }
    .dark-mode #cartDrawer { background: #0f172a !important; color: #f8fafc !important; border-left: 1px solid #1e293b !important; }
    .dark-mode #cartDrawer h2, .dark-mode #cartDrawer h5, .dark-mode #cartDrawer span, .dark-mode #cartDrawer p, .dark-mode #cartTotal { color: #f8fafc !important; }
    .dark-mode #checkoutBtn { box-shadow: none !important; }
    .dark-mode .dark-label { background: #1e293b !important; color: #f8fafc !important; border: 1px solid #334155; }
`;
document.head.appendChild(style);
function B(){const e=document.getElementById("productGrid");if(c.length===0){e.innerHTML='<p class="col-span-full text-center py-20 text-slate-400">No hay productos disponibles.</p>';return}e.innerHTML=c.map((t,n)=>`
                <div class="card-minimal flex flex-col overflow-hidden fade-in" style="animation-delay: ${n*.05}s">
                    <div class="relative bg-slate-50 aspect-square cursor-pointer overflow-hidden group" onclick="openProductDetail(${t.id})">
                        <img src="${t.imagen_url}" alt="${t.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <span class="bg-white dark-label text-slate-900 px-6 py-2 rounded-full text-xs font-bold shadow-xl">Vista Rápida</span>
                        </div>
                    </div>
                    <div class="p-6 flex flex-col flex-1">
                        <h4 class="font-bold text-slate-900 mb-1 leading-tight line-clamp-1">${t.titulo}</h4>
                        <p class="text-slate-400 text-xs mb-6 line-clamp-2 leading-relaxed">${t.descripcion||"Sin descripción"}</p>
                        
                        <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span class="text-lg font-bold text-slate-900">$${(t.precio||0).toLocaleString()}</span>
                            
                            <div class="flex items-center gap-2">
                                <div class="qty-minimal flex items-center gap-2">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${t.id}, -1)" class="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors">-</button>
                                    <input type="number" id="qty-${t.id}" value="1" min="1" class="w-6 text-center text-xs font-bold border-none focus:ring-0 p-0 bg-transparent" onclick="event.stopPropagation()">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${t.id}, 1)" class="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors">+</button>
                                </div>
                                <button onclick="event.stopPropagation(); addToCart(${t.id}, parseInt(document.getElementById('qty-${t.id}').value))" class="btn-primary p-2.5 rounded-lg">
                                    <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join(""),lucide.createIcons()}function r(){const e=document.getElementById("cartItems"),t=document.getElementById("cartTotal"),n=document.getElementById("cartCount");if(a.length===0){e.innerHTML=`
                    <div class="h-full flex flex-col items-center justify-center text-slate-300 text-center">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="shopping-bag" class="w-6 h-6 opacity-30"></i>
                        </div>
                        <p class="text-sm font-medium">Bolsa vacía</p>
                    </div>
                `,t.textContent="$0",n.classList.add("hidden"),lucide.createIcons();return}let o=0,s=0;e.innerHTML=a.map(l=>{const p=(l.precio||0)*l.qty;return o+=p,s+=l.qty,`
                <div class="flex gap-4 group">
                    <div class="w-16 h-16 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                        <img src="${l.imagen_url}" alt="${l.titulo}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h5 class="font-bold text-xs text-slate-900 truncate leading-none capitalize">${l.titulo}</h5>
                            <button onclick="removeFromCart(${l.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">${l.qty} x $${(l.precio||0).toLocaleString()}</p>
                        <div class="flex items-center justify-between">
                             <div class="qty-minimal flex items-center gap-1.5 px-1 py-0.5">
                                <button onclick="updateCartQty(${l.id}, -1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">-</button>
                                <span class="text-[10px] font-bold text-slate-900 w-3 text-center">${l.qty}</span>
                                <button onclick="updateCartQty(${l.id}, 1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">+</button>
                            </div>
                            <span class="text-xs font-bold text-slate-900">$${p.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                `}).join(""),t.textContent=`$${o.toLocaleString()}`,n.textContent=s,n.classList.remove("hidden"),lucide.createIcons()}function f(e,t){const n=c.find(s=>s.id===e);if(!n)return;const o=a.find(s=>s.id===e);o?o.qty+=t:a.push({...n,qty:t}),u(),r(),M()}function C(e,t){const n=a.find(o=>o.id===e);n&&(n.qty+=t,n.qty<=0?g(e):(u(),r()))}function g(e){a=a.filter(t=>t.id!==e),u(),r()}function u(){localStorage.setItem("cart_pro",JSON.stringify(a))}function i(){const e=document.getElementById("cartDrawer"),t=document.getElementById("cartOverlay");e.classList.contains("closed")?(e.classList.replace("closed","open"),t.classList.replace("opacity-0","opacity-100"),t.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(e.classList.replace("open","closed"),t.classList.replace("opacity-100","opacity-0"),t.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function L(e){const t=c.find(o=>o.id===e);if(!t)return;document.getElementById("modalImg").src=t.imagen_url,document.getElementById("modalTitle").textContent=t.titulo,document.getElementById("modalPrice").textContent=`$${(t.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=t.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{f(t.id,parseInt(document.getElementById("modalQty").value)),d()}}function d(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function k(e){const t=document.getElementById("modalQty");let n=parseInt(t.value)+e;n<1&&(n=1),t.value=n}function S(e,t){const n=document.getElementById(`qty-${e}`);let o=parseInt(n.value)+t;o<1&&(o=1),n.value=o}function y(){if(a.length===0)return alert("El carrito está vacío");let e=0,t=`Hola! Me interesa realizar el siguiente pedido:

`;a.forEach(o=>{const s=(o.precio||0)*o.qty;e+=s,t+=`*${o.qty}x* ${o.titulo} ($${(o.precio||0).toLocaleString()})
`}),t+=`
*Total:* $${e.toLocaleString()}`;const n=`https://wa.me/${m}?text=${encodeURIComponent(t)}`;window.open(n,"_blank")}function x(){const e="Hola, tengo una consulta sobre el catálogo...";document.getElementById("whatsappFloating").href=`https://wa.me/${m}?text=${encodeURIComponent(e)}`}function M(){const e=document.getElementById("openCart");e.classList.add("scale-110"),setTimeout(()=>e.classList.remove("scale-110"),300)}I();window.openProductDetail=L;window.updateModalQty=k;window.changeQtyInGrid=S;window.addToCart=f;window.toggleCart=i;window.closeModal=d;window.removeFromCart=g;window.updateCartQty=C;window.finalizeOrder=y;window.updateWhatsAppLink=x;
