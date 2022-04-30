import HF from "../../types/herofit";


function determineTransmutation(effect : HF.Effect) : Lowercase<HF.PrimaryElement> | undefined{
  const effectToElementMap = {
    'Water Transmutation' : 'water',
    'Earth Transmutation' : 'earth',
    'Air Transmutation' : 'air',
    'Fire Transmutation' : 'fire'
  } as {[x : string] : Lowercase<HF.PrimaryElement>}

  return effectToElementMap[effect?.name];
}

export { determineTransmutation }