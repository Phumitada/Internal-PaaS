export function getInternalPort(framework: string): number {
  if(framework == 'react'){
    return 80
  }else{
    return 3000
  }
}