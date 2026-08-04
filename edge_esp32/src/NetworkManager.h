#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include "HardwareController.h"

class NetworkManager {
private:
    static Preferences preferencias; 
    static AsyncWebServer servidor;  
    static DNSServer dnsServer;      
    static bool modoAP;              
    static bool debeReiniciar;       
    
    static HardwareController* _hw; 

public:
    NetworkManager(); 
    void iniciar();   
    bool estaConectado() const; 
    static volatile bool _conexionEstable; 
    bool estaEnModoAP() const;  
    void sincronizarReloj(); 
    String getHoraActual() const; 
    int getHoraInt() const; 

    static void setHardwareController(HardwareController* hw) {
        _hw = hw;
    }

private:
    static void tareaRed(void * parametro); 
    static void configurarPortal();         
}; 

#endif
