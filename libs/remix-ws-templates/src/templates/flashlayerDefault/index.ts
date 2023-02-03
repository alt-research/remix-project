export default async () => {
    return {
        // @ts-ignore
        'contracts/1_ERC721.sol': (await import('raw-loader!./contracts/1_ERC721.sol')).default,
        // @ts-ignore
        'scripts/deploy_with_ethers.ts': (await import('!!raw-loader!./scripts/deploy_with_ethers.ts')).default,
        // @ts-ignore
        'scripts/deploy_with_web3.ts': (await import('!!raw-loader!./scripts/deploy_with_web3.ts')).default,
        // @ts-ignore
        'scripts/ethers-lib.ts': (await import('!!raw-loader!./scripts/ethers-lib.ts')).default,
        // @ts-ignore
        'scripts/web3-lib.ts': (await import('!!raw-loader!./scripts/web3-lib.ts')).default,
        // @ts-ignore
        'README.txt': (await import('raw-loader!./README.txt')).default,
    }
}
