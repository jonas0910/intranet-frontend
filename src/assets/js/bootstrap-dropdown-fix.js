/**
 * Bootstrap Dropdown Fix para AdminLTE
 * Soluciona problemas de compatibilidad entre Bootstrap 5 y AdminLTE 3.2.0
 */

(function() {
  'use strict';

  // Esperar a que jQuery esté disponible
  function waitForJQuery(callback) {
    if (typeof window.$ !== 'undefined') {
      callback();
    } else {
      setTimeout(() => waitForJQuery(callback), 100);
    }
  }

  waitForJQuery(function() {
    const $ = window.$;
    
    // Función para inicializar dropdowns
    function initializeDropdowns() {
      // Buscar todos los dropdowns del navbar
      const dropdownToggles = $('.navbar-nav [data-toggle="dropdown"], .navbar-nav .dropdown-toggle');
      
      dropdownToggles.each(function() {
        const $toggle = $(this);
        const $parent = $toggle.parent();
        const $menu = $parent.find('> .dropdown-menu');
        
        if ($menu.length > 0) {
          // Limpiar handlers previos
          $toggle.off('click.bootstrap-dropdown-fix');
          
          // Configurar handler personalizado en el enlace principal
          $toggle.on('click.bootstrap-dropdown-fix', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = $parent.hasClass('show');
            
            // Cerrar otros dropdowns abiertos
            $('.navbar-nav .nav-item.dropdown').removeClass('show');
            $('.navbar-nav .dropdown-menu').removeClass('show');
            
            // Toggle del dropdown actual
            if (!isOpen) {
              $parent.addClass('show');
              $menu.addClass('show');
            }
          });
          
          // También configurar handlers en elementos hijos (badges, iconos, etc.)
          $toggle.find('*').on('click.bootstrap-dropdown-fix', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Disparar el click en el enlace padre
            $toggle.trigger('click');
          });
        }
      });
      
      // Cerrar dropdowns al hacer click fuera
      $(document).off('click.bootstrap-dropdown-fix').on('click.bootstrap-dropdown-fix', function(e) {
        if (!$(e.target).closest('.navbar-nav .dropdown').length) {
          $('.navbar-nav .nav-item.dropdown').removeClass('show');
          $('.navbar-nav .dropdown-menu').removeClass('show');
        }
      });
    }
    
    // Inicializar una sola vez
    initializeDropdowns();
    
    // Solo reinicializar cuando sea necesario (contenido dinámico)
    $(document).on('DOMNodeInserted', function() {
      setTimeout(initializeDropdowns, 100);
    });
  });
})();
