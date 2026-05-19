import{c as x}from"./index-CMzVDswU.js";const v="https://ehxsodyuzpduggxbffmk.supabase.co",w="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",b=x(v,w);let u=[],a=JSON.parse(localStorage.getItem("cart_pro"))||[];async function I(){(localStorage.getItem("gini_theme")||"light")==="dark"&&document.documentElement.classList.add("dark"),g(),lucide.createIcons(),k(),await E(),i(),q()}function k(){document.getElementById("openCart").onclick=s,document.getElementById("closeCart").onclick=s,document.getElementById("cartOverlay").onclick=s,document.getElementById("closeModal").onclick=r,document.getElementById("productModal").onclick=t=>{t.target===document.getElementById("productModal")&&r()},document.getElementById("checkoutBtn").onclick=y,document.getElementById("searchInput").oninput=d,document.getElementById("sortSelect").onchange=d,document.getElementById("themeToggle").onclick=p}function p(){var e,n,o;document.documentElement.classList.contains("dark")?(document.documentElement.classList.remove("dark"),document.documentElement.style.colorScheme="light",localStorage.setItem("gini_theme","light")):(document.documentElement.classList.add("dark"),document.documentElement.style.colorScheme="dark",localStorage.setItem("gini_theme","dark")),g(),(o=(n=(e=window.tailwind)==null?void 0:e.preflightStyleSheet)==null?void 0:n.remove)==null||o.call(n)}function g(){const t=document.getElementById("themeToggle");if(!t)return;const e=document.documentElement.classList.contains("dark");t.innerHTML=e?'<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>':'<i data-lucide="moon" class="w-4 h-4"></i>',lucide.createIcons()}async function E(){try{const{data:t,error:e}=await b.from("productos").select("*").order("created_at",{ascending:!1});if(e)throw e;u=t,d()}catch(t){console.error("Error fetching products:",t)}}function d(){const t=document.getElementById("searchInput").value.toLowerCase().trim(),e=document.getElementById("sortSelect").value;let n=u.filter(o=>o.titulo.toLowerCase().includes(t));e==="price-asc"?n.sort((o,l)=>(o.precio||0)-(l.precio||0)):e==="price-desc"?n.sort((o,l)=>(l.precio||0)-(o.precio||0)):e==="name-asc"?n.sort((o,l)=>o.titulo.localeCompare(l.titulo)):e==="name-desc"&&n.sort((o,l)=>l.titulo.localeCompare(o.titulo)),C(n)}function C(t){const e=document.getElementById("productGrid"),n=document.getElementById("productCount");if(t.length===0){e.innerHTML=`
                    <div class="col-span-full py-24 flex flex-col items-center text-center text-slate-400">
                        <div class="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="search-x" class="w-5 h-5 text-slate-400"></i>
                        </div>
                            <h4 class="text-sm font-bold text-slate-800 dark:text-white">No hay coincidencias</h4>
                    </div>
                `,n.textContent="0 PRODUCTOS",lucide.createIcons();return}n.textContent=`${t.length} PRODUCTOS`,e.innerHTML=t.map((o,l)=>`
                <div class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-all shadow-sm hover:shadow-md flex flex-col overflow-hidden fade-in" style="animation-delay: ${l*.01}s">
                    <div class="relative bg-slate-50 dark:bg-slate-900 aspect-square cursor-pointer overflow-hidden group" onclick="openProductDetail(${o.id})">
                        <img src="${o.imagen_url}" alt="${o.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <span class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl">Vista rápida</span>
                        </div>
                    </div>
                    <div class="p-3 flex flex-col flex-1">
                        <h4 class="font-bold text-slate-900 dark:text-white mb-0.5 leading-tight line-clamp-1 text-sm capitalize">${o.titulo}</h4>
                        <p class="text-slate-400 dark:text-slate-300 text-[11px] mb-3 line-clamp-1 leading-relaxed">${o.descripcion||"Sin descripción"}</p>
                        <div class="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-2">

    <span class="text-sm font-bold text-slate-900 dark:text-white">
        $${(o.precio||0).toLocaleString()}
    </span>

    <div class="flex items-center justify-between gap-2">

        <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-1 shrink-0"
            onclick="event.stopPropagation();">

            <button onclick="changeQtyInGrid(${o.id}, -1)"
                class="w-6 h-7 flex items-center justify-center font-bold">
                -
            </button>

            <input type="number"
                id="qty-${o.id}"
                value="1"
                min="1"
                readonly
                class="w-5 text-center text-sm font-bold border-none bg-transparent pointer-events-none">

            <button onclick="changeQtyInGrid(${o.id}, 1)"
                class="w-6 h-7 flex items-center justify-center font-bold">
                +
            </button>
        </div>

        <button
            onclick="event.stopPropagation(); addToCart(${o.id}, parseInt(document.getElementById('qty-${o.id}').value))"
            class="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">

            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
        </button>

    </div>
</div>
</div>
                    </div>
                </div>
            `).join(""),requestAnimationFrame(()=>{lucide.createIcons()})}function i(){const t=document.getElementById("cartItems"),e=document.getElementById("cartTotal"),n=document.getElementById("cartCount");let o=0,l=0;if(a.length===0){t.innerHTML='<div class="h-full flex items-center justify-center text-slate-400 text-sm">Bolsa vacía</div>',e.textContent="$0",n.textContent="0",n.classList.add("hidden");return}t.innerHTML=a.map(c=>(o+=(c.precio||0)*c.qty,l+=c.qty,`
    <div class="flex gap-4 justify-between items-start">
        <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
            <img src="${c.imagen_url}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
            <h5 class="font-bold text-sm text-slate-900 dark:text-white truncate cart-item-title" title="${c.titulo}">${c.titulo}</h5>
            <p class="text-[10px] text-slate-400 dark:text-slate-300 uppercase">${c.qty} x $${c.precio}</p>
            <div class="flex items-center justify-between mt-1">
                <div class="flex items-center gap-2">
                    <button onclick="updateCartQty(${c.id}, -1)" class="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">-</button>
                    <span class="text-slate-900 dark:text-white">${c.qty}</span>
                    <button onclick="updateCartQty(${c.id}, 1)" class="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">+</button>
                </div>
            </div>
        </div>
        <button onclick="removeFromCart(${c.id})" class="cart-item-delete" title="Eliminar">×</button>
    </div>`)).join(""),e.textContent=`$${o.toLocaleString()}`,n.textContent=l,n.classList.remove("hidden"),lucide.createIcons()}function f(t,e){const n=u.find(l=>l.id===t);if(!n)return;const o=a.find(l=>l.id===t);o?o.qty+=e:a.push({...n,qty:e}),m(),i(),j()}function B(t,e){const n=a.findIndex(o=>o.id===t);n!==-1&&(a[n].qty+=e,a[n].qty<=0&&a.splice(n,1),m(),i())}function $(t){a=a.filter(e=>e.id!==t),m(),i()}function L(){if(a.length===0)return;document.getElementById("confirmModal").classList.replace("hidden","visible")}function h(){document.getElementById("confirmModal").classList.replace("visible","hidden")}function S(){a=[],m(),i(),h()}function m(){localStorage.setItem("cart_pro",JSON.stringify(a))}function s(){const t=document.getElementById("cartDrawer"),e=document.getElementById("cartOverlay");t.classList.contains("closed")?(t.classList.replace("closed","open"),e.classList.replace("opacity-0","opacity-100"),e.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(t.classList.replace("open","closed"),e.classList.replace("opacity-100","opacity-0"),e.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function T(t){const e=u.find(o=>o.id===t);if(!e)return;document.getElementById("modalImg").src=e.imagen_url,document.getElementById("modalTitle").textContent=e.titulo,document.getElementById("modalPrice").textContent=`$${(e.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=e.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{f(e.id,parseInt(document.getElementById("modalQty").value)),r()}}function r(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function M(t){const e=document.getElementById("modalQty");let n=parseInt(e.value)+t;n<1&&(n=1),e.value=n}function _(t,e){const n=document.getElementById(`qty-${t}`);let o=parseInt(n.value)+e;o<1&&(o=1),n.value=o}function y(){if(a.length===0)return alert("El carrito está vacío");let t=0,e=`Hola! Me interesa realizar el siguiente pedido:

`;a.forEach(n=>{t+=(n.precio||0)*n.qty,e+=`*${n.qty}x* ${n.titulo} ($${(n.precio||0).toLocaleString()})
`}),e+=`
*Total:* $${t.toLocaleString()}`,window.open(`https://wa.me/5493513278986?text=${encodeURIComponent(e)}`,"_blank")}function q(){document.getElementById("whatsappFloating").href=`https://wa.me/5493513278986?text=${encodeURIComponent("Hola, tengo una consulta...")}`}function j(){const t=document.getElementById("openCart");t.classList.add("scale-110"),setTimeout(()=>t.classList.remove("scale-110"),300)}I();window.openProductDetail=T;window.updateModalQty=M;window.changeQtyInGrid=_;window.addToCart=f;window.toggleCart=s;window.closeModal=r;window.removeFromCart=$;window.updateCartQty=B;window.finalizeOrder=y;window.handleSearchAndSort=d;window.toggleTheme=p;window.openConfirmModal=L;window.closeConfirmModal=h;window.executeClearCart=S;
