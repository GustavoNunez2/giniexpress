import{c as b}from"./index-CMzVDswU.js";const w="https://ehxsodyuzpduggxbffmk.supabase.co",I="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",m="5493513278986",$=b(w,I);let c=[],s=JSON.parse(localStorage.getItem("cart_pro"))||[];async function E(){lucide.createIcons(),B(),await C(),r(),h()}function B(){document.getElementById("openCart").onclick=i,document.getElementById("closeCart").onclick=i,document.getElementById("cartOverlay").onclick=i,document.getElementById("closeModal").onclick=d,document.getElementById("productModal").onclick=t=>{t.target===document.getElementById("productModal")&&d()},document.getElementById("checkoutBtn").onclick=v,document.getElementById("searchInput").oninput=g}async function C(){try{const{data:t,error:e}=await $.from("productos").select("*").order("created_at",{ascending:!1});if(e)throw e;c=t,f(c)}catch(t){console.error("Error fetching products:",t),document.getElementById("productGrid").innerHTML=`
                    <div class="col-span-full py-20 text-center text-red-500">
                        <p>Ups! No pudimos cargar los productos.</p>
                        <p class="text-sm opacity-50">${t.message}</p>
                    </div>
                `}}function f(t=c){const e=document.getElementById("productGrid"),o=document.getElementById("productCount");if(t.length===0){e.innerHTML=`
                    <div class="col-span-full py-24 flex flex-col items-center text-center text-slate-400">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="search-x" class="w-6 h-6 text-slate-400"></i>
                        </div>
                        <h4 class="text-lg font-bold text-slate-800">No hay coincidencias</h4>
                        <p class="text-sm text-slate-400 mt-1 max-w-xs">No encontramos ningún producto que coincida con lo que estás buscando.</p>
                    </div>
                `,o.textContent="0 PRODUCTOS",lucide.createIcons();return}o.textContent=`${t.length} PRODUCTOS`,e.innerHTML=t.map((n,a)=>`
                <div class="card-minimal flex flex-col overflow-hidden fade-in" style="animation-delay: ${a*.02}s">
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
                            <span class="text-sm font-bold text-slate-900">$${(n.precio||0).toLocaleString()}</span>
                            
                            <div class="flex items-center gap-1.5">
                                <div class="qty-minimal flex items-center gap-1.5">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, -1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">-</button>
                                    <input type="number" id="qty-${n.id}" value="1" min="1" class="w-5 text-center text-[11px] font-bold border-none focus:ring-0 p-0 bg-transparent" onclick="event.stopPropagation()">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, 1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">+</button>
                                </div>
                                <button onclick="event.stopPropagation(); addToCart(${n.id}, parseInt(document.getElementById('qty-${n.id}').value))" class="btn-primary p-2 rounded-lg">
                                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join(""),lucide.createIcons()}function g(){const t=document.getElementById("searchInput").value.toLowerCase().trim(),e=c.filter(o=>o.titulo.toLowerCase().includes(t));f(e)}function r(){const t=document.getElementById("cartItems"),e=document.getElementById("cartTotal"),o=document.getElementById("cartCount");if(s.length===0){t.innerHTML=`
                    <div class="h-full flex flex-col items-center justify-center text-slate-300 text-center">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="shopping-bag" class="w-6 h-6 opacity-30"></i>
                        </div>
                        <p class="text-sm font-medium">Bolsa vacía</p>
                    </div>
                `,e.textContent="$0",o.classList.add("hidden"),lucide.createIcons();return}let n=0,a=0;t.innerHTML=s.map(l=>{const p=(l.precio||0)*l.qty;return n+=p,a+=l.qty,`
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
                `}).join(""),e.textContent=`$${n.toLocaleString()}`,o.textContent=a,o.classList.remove("hidden"),lucide.createIcons()}function x(t,e){const o=c.find(a=>a.id===t);if(!o)return;const n=s.find(a=>a.id===t);n?n.qty+=e:s.push({...o,qty:e}),u(),r(),P()}function L(t,e){const o=s.find(n=>n.id===t);o&&(o.qty+=e,o.qty<=0?y(t):(u(),r()))}function y(t){s=s.filter(e=>e.id!==t),u(),r()}function u(){localStorage.setItem("cart_pro",JSON.stringify(s))}function i(){const t=document.getElementById("cartDrawer"),e=document.getElementById("cartOverlay");t.classList.contains("closed")?(t.classList.replace("closed","open"),e.classList.replace("opacity-0","opacity-100"),e.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(t.classList.replace("open","closed"),e.classList.replace("opacity-100","opacity-0"),e.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function k(t){const e=c.find(n=>n.id===t);if(!e)return;document.getElementById("modalImg").src=e.imagen_url,document.getElementById("modalTitle").textContent=e.titulo,document.getElementById("modalPrice").textContent=`$${(e.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=e.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{x(e.id,parseInt(document.getElementById("modalQty").value)),d()}}function d(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function S(t){const e=document.getElementById("modalQty");let o=parseInt(e.value)+t;o<1&&(o=1),e.value=o}function q(t,e){const o=document.getElementById(`qty-${t}`);let n=parseInt(o.value)+e;n<1&&(n=1),o.value=n}function v(){if(s.length===0)return alert("El carrito está vacío");let t=0,e=`Hola! Me interesa realizar el siguiente pedido:

`;s.forEach(n=>{const a=(n.precio||0)*n.qty;t+=a,e+=`*${n.qty}x* ${n.titulo} ($${(n.precio||0).toLocaleString()})
`}),e+=`
*Total:* $${t.toLocaleString()}`;const o=`https://wa.me/${m}?text=${encodeURIComponent(e)}`;window.open(o,"_blank")}function h(){const t="Hola, tengo una consulta sobre el catálogo...";document.getElementById("whatsappFloating").href=`https://wa.me/${m}?text=${encodeURIComponent(t)}`}function P(){const t=document.getElementById("openCart");t.classList.add("scale-110"),setTimeout(()=>t.classList.remove("scale-110"),300)}E();window.openProductDetail=k;window.updateModalQty=S;window.changeQtyInGrid=q;window.addToCart=x;window.toggleCart=i;window.closeModal=d;window.removeFromCart=y;window.updateCartQty=L;window.finalizeOrder=v;window.updateWhatsAppLink=h;window.handleSearch=g;
