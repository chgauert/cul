Intertechno V1 Protocol Details

Hauscode (die ersten vier Stellen (0-3)
Gruppen-/Gerätecode (Stelle 4-7)
Stellen 8-9 (Festwert 0F)
Stellen 10-11 (Ein/Aus)
Bei den beiden letzten Stellen steht als Codierung für ON = FF und OFF = F0.



Intertechno V3 Protocol Details

The ON/OFF protocol is using a sequence of 33 codes:

Starting code of type 's'.
26 data codes that represent the unique 26 bit id of the sender.
1 data code used as a flag to address all receivers, any button.
1 data code to switch the device on ('#') or off ('_')
4 data codes specifying the pressed button / unit.



Dimming Protocol Details
In case of the dimming devices a specific dimming value can be set directly using a 37 code sequence.

This code uses a 'D' code (shorter than the others) instead of on/off to indicate the transmission of a dim command. Before the terminating code 4 additional data codes are sent to specify the dim level:

Starting code of type 's'.
26 data codes that represent the unique 26 bit id of the sender.
1 data code used as a flag to address all receivers, any button.
1 data code 'D'
4 data codes specifying the pressed button / unit.
4 data codes specifying the dim level.
      

DimLevel: 0     -> 0%
            .....           -> 15 Stufen 
          1111  -> 100%    



See also
https://github.com/mathertel/rfcodes/blob/master/examples/intertechno/README.md
https://wiki.fhem.de/wiki/Intertechno_Code_Berechnung
