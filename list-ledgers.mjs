// List all ledgers with their groups
import { handlePull } from './dist/tally.mjs';

async function main() {
    console.log('=== All Ledgers in Tally ===\n');

    const ledgerResult = await handlePull('list-master', new Map([['collection', 'ledger']]));

    if (ledgerResult.error) {
        console.error('Error:', ledgerResult.error);
        return;
    }

    console.log('Ledgers:');
    ledgerResult.data?.forEach((l, i) => console.log(`  ${i + 1}. ${l.name}`));

    console.log('\n=== All Groups in Tally ===\n');

    const groupResult = await handlePull('list-master', new Map([['collection', 'group']]));

    if (groupResult.error) {
        console.error('Error:', groupResult.error);
        return;
    }

    console.log('Groups:');
    groupResult.data?.forEach((g, i) => console.log(`  ${i + 1}. ${g.name}`));

    console.log('\n=== Chart of Accounts (Groups with Hierarchy) ===\n');

    const chartResult = await handlePull('chart-of-accounts', new Map());

    if (chartResult.error) {
        console.error('Error:', chartResult.error);
        return;
    }

    // Find groups relevant for purchase entry
    console.log('Groups under Sundry Creditors (for suppliers):');
    const creditorGroups = chartResult.data?.filter(g =>
        g.group_parent === 'Sundry Creditors' || g.group_name === 'Sundry Creditors'
    );
    creditorGroups?.forEach(g => console.log(`  - ${g.group_name} (parent: ${g.group_parent})`));

    console.log('\nGroups under Purchase Accounts (for purchases):');
    const purchaseGroups = chartResult.data?.filter(g =>
        g.group_parent === 'Purchase Accounts' || g.group_name === 'Purchase Accounts'
    );
    purchaseGroups?.forEach(g => console.log(`  - ${g.group_name} (parent: ${g.group_parent})`));

    console.log('\n=== Stock Items ===\n');

    const stockResult = await handlePull('list-master', new Map([['collection', 'stockitem']]));

    if (stockResult.data?.length > 0) {
        console.log('Stock Items:');
        stockResult.data?.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
    } else {
        console.log('No stock items found.');
    }

    console.log('\n=== Companies ===\n');

    const companyResult = await handlePull('list-master', new Map([['collection', 'company']]));

    console.log('Available Companies:');
    companyResult.data?.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));
}

main().catch(console.error);
