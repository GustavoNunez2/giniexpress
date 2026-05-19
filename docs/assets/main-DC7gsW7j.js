import{c as v}from"./index-CMzVDswU.js";const b="https://ehxsodyuzpduggxbffmk.supabase.co",w="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",I=v(b,w);let r=[],c=JSON.parse(localStorage.getItem("cart_pro"))||[];async function E(){(localStorage.getItem("gini_theme")||"light")==="dark"&&document.body.classList.add("dark-mode"),f(),lucide.createIcons(),B(),await C(),u(),q()}function B(){document.getElementById("openCart").onclick=s,document.getElementById("closeCart").onclick=s,document.getElementById("cartOverlay").onclick=s,document.getElementById("closeModal").onclick=d,document.getElementById("productModal").onclick=t=>{t.target===document.getElementById("productModal")&&d()},document.getElementById("checkoutBtn").onclick=h,document.getElementById("searchInput").oninput=i,document.getElementById("sortSelect").onchange=i,document.getElementById("themeToggle").onclick=g}function g(){const t=document.body.classList.toggle("dark-mode");localStorage.setItem("gini_theme",t?"dark":"light"),f()}function f(){const t=document.getElementById("themeToggle");if(!t)return;const e=document.body.classList.contains("dark-mode");t.innerHTML=e?'<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>':'<i data-lucide="moon" class="w-4 h-4"></i>',lucide.createIcons()}async function C(){try{const{data:t,error:e}=await I.from("productos").select("*").order("created_at",{ascending:!1});if(e)throw e;r=t,i()}catch(t){console.error("Error fetching products:",t)}}function i(){const t=document.getElementById("searchInput").value.toLowerCase().trim(),e=document.getElementById("sortSelect").value;let o=r.filter(n=>n.titulo.toLowerCase().includes(t));e==="price-asc"?o.sort((n,l)=>(n.precio||0)-(l.precio||0)):e==="price-desc"?o.sort((n,l)=>(l.precio||0)-(n.precio||0)):e==="name-asc"?o.sort((n,l)=>n.titulo.localeCompare(l.titulo)):e==="name-desc"&&o.sort((n,l)=>l.titulo.localeCompare(n.titulo)),$(o)}function $(t){const e=document.getElementById("productGrid"),o=document.getElementById("productCount");if(t.length===0){e.innerHTML=`
                    <div class="col-span-full py-24 flex flex-col items-center text-center text-slate-400">
                        <div class="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="search-x" class="w-5 h-5 text-slate-400"></i>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800">No hay coincidencias</h4>
                    </div>
                `,o.textContent="0 PRODUCTOS",lucide.createIcons();return}o.textContent=`${t.length} PRODUCTOS`,e.innerHTML=t.map((n,l)=>`
                <div class="card-minimal flex flex-col overflow-hidden fade-in" style="animation-delay: ${l*.01}s">
                    <div class="relative bg-slate-50 aspect-square cursor-pointer overflow-hidden group" onclick="openProductDetail(${n.id})">
                        <img src="${n.imagen_url}" alt="${n.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <span class="bg-white text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl">Quick View</span>
                        </div>
                    </div>
                    <div class="p-3 flex flex-col flex-1">
                        <h4 class="font-bold text-slate-900 mb-0.5 leading-tight line-clamp-1 text-xs capitalize">${n.titulo}</h4>
                        <p class="text-slate-400 text-[11px] mb-3 line-clamp-1 leading-relaxed">${n.descripcion||"Sin descripción"}</p>
                        
                        <div class="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-900">$${(n.precio||0).toLocaleString()}</span>
                            
                            <div class="flex items-center gap-1.5">
                                <div class="qty-minimal flex items-center gap-1.5">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, -1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">-</button>
                                    <input type="number" id="qty-${n.id}" value="1" min="1" class="w-5 text-center text-[11px] font-bold border-none focus:ring-0 p-0 bg-transparent" onclick="event.stopPropagation()">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, 1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">+</button>
                                </div>
                                <button onclick="event.stopPropagation(); addToCart(${n.id}, parseInt(document.getElementById('qty-${n.id}').value))" class="btn-primary p-2 rounded-lg cursor-pointer">
                                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join(""),lucide.createIcons()}function u(){const t=document.getElementById("cartItems"),e=document.getElementById("cartTotal"),o=document.getElementById("cartCount");if(c.length===0){t.innerHTML=`
                    <div class="h-full flex flex-col items-center justify-center text-slate-300 text-center">
                        <p class="text-sm font-medium">Bolsa vacía</p>
                    </div>
                `,e.textContent="$0",o.classList.add("hidden");return}let n=0,l=0;t.innerHTML=c.map(a=>{const p=(a.precio||0)*a.qty;return n+=p,l+=a.qty,`
                <div class="flex gap-4 group">
                    <div class="w-14 h-14 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border">
                        <img src="${a.imagen_url}" alt="${a.titulo}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h5 class="font-bold text-xs text-slate-900 truncate leading-none capitalize">${a.titulo}</h5>
                            <button onclick="removeFromCart(${a.id})" class="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">${a.qty} x $${(a.precio||0).toLocaleString()}</p>
                        <div class="flex items-center justify-between">
                             <div class="qty-minimal flex items-center gap-1.5 px-1 py-0.5">
                                <button onclick="updateCartQty(${a.id}, -1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">-</button>
                                <span class="text-[10px] font-bold text-slate-900 w-3 text-center">${a.qty}</span>
                                <button onclick="updateCartQty(${a.id}, 1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">+</button>
                            </div>
                            <span class="text-xs font-bold text-slate-900">$${p.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                `}).join(""),e.textContent=`$${n.toLocaleString()}`,o.textContent=l,o.classList.remove("hidden"),lucide.createIcons()}function y(t,e){const o=r.find(l=>l.id===t);if(!o)return;const n=c.find(l=>l.id===t);n?n.qty+=e:c.push({...o,qty:e}),m(),u(),M()}function L(t,e){const o=c.find(n=>n.id===t);o&&(o.qty+=e,o.qty<=0?x(t):(m(),u()))}function x(t){c=c.filter(e=>e.id!==t),m(),u()}function m(){localStorage.setItem("cart_pro",JSON.stringify(c))}function s(){const t=document.getElementById("cartDrawer"),e=document.getElementById("cartOverlay");t.classList.contains("closed")?(t.classList.replace("closed","open"),e.classList.replace("opacity-0","opacity-100"),e.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(t.classList.replace("open","closed"),e.classList.replace("opacity-100","opacity-0"),e.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function k(t){const e=r.find(n=>n.id===t);if(!e)return;document.getElementById("modalImg").src=e.imagen_url,document.getElementById("modalTitle").textContent=e.titulo,document.getElementById("modalPrice").textContent=`$${(e.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=e.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{y(e.id,parseInt(document.getElementById("modalQty").value)),d()}}function d(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function S(t){const e=document.getElementById("modalQty");let o=parseInt(e.value)+t;o<1&&(o=1),e.value=o}function T(t,e){const o=document.getElementById(`qty-${t}`);let n=parseInt(o.value)+e;n<1&&(n=1),o.value=n}function h(){if(c.length===0)return alert("El carrito está vacío");let t=0,e=`Hola! Me interesa realizar el siguiente pedido:

`;c.forEach(o=>{t+=(o.precio||0)*o.qty,e+=`*${o.qty}x* ${o.titulo} ($${(o.precio||0).toLocaleString()})
`}),e+=`
*Total:* $${t.toLocaleString()}`,window.open(`https://wa.me/5493513278986?text=${encodeURIComponent(e)}`,"_blank")}function q(){document.getElementById("whatsappFloating").href=`https://wa.me/5493513278986?text=${encodeURIComponent("Hola, tengo una consulta...")}`}function M(){const t=document.getElementById("openCart");t.classList.add("scale-110"),setTimeout(()=>t.classList.remove("scale-110"),300)}E();window.openProductDetail=k;window.updateModalQty=S;window.changeQtyInGrid=T;window.addToCart=y;window.toggleCart=s;window.closeModal=d;window.removeFromCart=x;window.updateCartQty=L;window.finalizeOrder=h;window.handleSearchAndSort=i;window.toggleTheme=g;
